import joinMonster from "join-monster";

import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInt
} from "graphql";

const express = require("express");
const mysql = require("mysql");
const graphqlHTTP = require("express-graphql");
const GraphQLDate = require("graphql-date");
const cors = require('cors')

const pool = mysql.createPool({
  connectionLimit : 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: "cases"
});

const PDFType = new GraphQLObjectType({
  name: "PDF",
  sqlTable: "case_pdf",
  uniqueKey: "pdf_id",
  fields: () => ({
    pdf_id: {
      type: GraphQLInt
    },
    fetch_date: {
      type: GraphQLDate
    },
    bucket_key: {
      type: GraphQLString
    }
  })
})

const CaseType = new GraphQLObjectType({
  name: "Case",
  sqlTable: "cases",
  uniqueKey: "id",
  fields: () => ({
    id: {
      type: GraphQLInt
    },
    case_date: {
      type: GraphQLDate
    },
    case_text: {
      type: GraphQLString
    },
    case_name: {
      type: GraphQLString
    },
    pdf_id: {
      type: GraphQLInt
    },
    PDF: {
      type: PDFType,
      sqlBatch: {
        thisKey: "pdf_id",
        parentKey: "pdf_id"
      }
    },
    citations: {
      type: new GraphQLList(CitationType),
      sqlBatch: {
        thisKey: "case_id",
        parentKey: "id"
      }
    },
    cited_by: {
      type: new GraphQLList(CaseType),
      junction: {
        sqlTable: "cases_cited",
        sqlJoins: [
          // first the parent table to the junction
          (casesTable, junctionTable, args) =>
            `${casesTable}.id = ${junctionTable}.case_cited`,
          // then the junction to the child
          (junctionTable, citedByTable, args) =>
            `${junctionTable}.case_origin = ${citedByTable}.id`
        ]
      }
    },
    cites: {
      type: new GraphQLList(CaseType),
      junction: {
        sqlTable: "cases_cited",
        sqlJoins: [
          // first the parent table to the junction
          (casesTable, junctionTable, args) =>
            `${casesTable}.id = ${junctionTable}.case_origin`,
          // then the junction to the child
          (junctionTable, citedByTable, args) =>
            `${junctionTable}.case_cited = ${citedByTable}.id`
        ]
      }
    },
    legislationReferences: {
      type: new GraphQLList(LegislationReferenceType),
      sqlBatch: {
        thisKey: "case_id",
        parentKey: "id"
      }
    }
  })
});

const LegislationType = new GraphQLObjectType({
  name: "Legislation",
  sqlTable: "legislation",
  uniqueKey: "id",
  fields: () => ({
    id: {
      type: GraphQLInt
    },
    title: {
      type: GraphQLString
    },
    link: {
      type: GraphQLString
    },
    year: {
      type: GraphQLString
    },
    alerts: {
      type: GraphQLString
    },
    caseReferences: {
      type: new GraphQLList(LegislationReferenceType),
      sqlBatch: {
        thisKey: "legislation_id",
        parentKey: "id"
      }
    }
  })
});

const LegislationReferenceType = new GraphQLObjectType({
  name: "LegislationReferences",
  sqlTable: "legislation_to_cases",
  uniqueKey: ["legislation_id", "section", "case_id"],
  fields: () => ({
    legislation_id: {
      type: GraphQLInt
    },
    section: {
      type: GraphQLString
    },
    case_id: {
      type: GraphQLInt
    },
    count: {
      type: GraphQLInt
    },
    legislation: {
      type: LegislationType,
      sqlJoin(referenceTable, legislationTable) {
        return `${referenceTable}.legislation_id = ${legislationTable}.id`;
      }
    },
    case: {
      type: CaseType,
      sqlJoin(referenceTable, caseTable) {
        return `${referenceTable}.case_id = ${caseTable}.id`;
      }
    }
  })
});

const CitationType = new GraphQLObjectType({
  name: "CaseCitations",
  sqlTable: "case_citations",
  uniqueKey: "citation",
  fields: () => ({
    case_id: {
      type: GraphQLInt
    },
    citation: {
      type: GraphQLString
    },
    case: {
      type: CaseType,
      sqlJoin(referenceTable, caseTable) {
        return `${referenceTable}.case_id = ${caseTable}.id`;
      }
    }
  })
});

function dbCall(sql) {
  return new Promise(function(resolve, reject) {
    pool.query(sql, (err, results, fields) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(results);
    });
  });
}

function standardResolver(parent, args, context, resolveInfo) {
  return joinMonster(resolveInfo, context, dbCall, { dialect: "mysql" });
}

var QueryRoot = new GraphQLObjectType({
  name: "Query",
  fields: {
    cases: {
      type: new GraphQLList(CaseType),
      resolve: standardResolver
    },
    case: {
      type: CaseType,
      args: {
        id: {
          description: "The case's ID number",
          type: new GraphQLNonNull(GraphQLInt)
        }
      },
      // this function generates the WHERE condition
      where: (casesTable, args, context) => {
        // eslint-disable-line no-unused-vars
        return `${casesTable}.id = ${args.id}`;
      },
      resolve: standardResolver
    },
    citation: {
      type: CitationType,
      args: {
        citation: {
          description: "The case citation",
          type: GraphQLString
        }
      },
      // this function generates the WHERE condition
      where: (caseCitationTable, args, context) => {
        // eslint-disable-line no-unused-vars
        return `${caseCitationTable}.citation = ${args.citation}`;
      },
      resolve: standardResolver
    },
    legislations: {
      type: new GraphQLList(LegislationType),
      resolve: standardResolver
    },
    legislation: {
      type: LegislationType,
      args: {
        id: {
          description: "The legislation's ID number",
          type: GraphQLInt
        },
        title: {
          description: "The legislation's title",
          type: GraphQLString
        }
      },
      // this function generates the WHERE condition
      where: (legislationTable, args, context) => {

        // eslint-disable-line no-unused-vars
        if(args.id) {
          return `${legislationTable}.id = ${args.id}`;
        } else if(args.title) {
          return `${legislationTable}.title = ${args.title}`;
        }
      },
      resolve: standardResolver
    }
  }
});

var schema = new GraphQLSchema({ query: QueryRoot });

var app = express();
app.use(cors())
app.get("/search", (req, res) => {

  pool.query("SELECT id, case_name, case_date from cases.cases where match(case_text) against(?)", [req.query.q], function (error, results, fields) {

    if (error) throw error;
    res.json(results)

  });

})

app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    graphiql: true
  })
);

app.listen(process.env.PORT || 4000);

console.log("Running a GraphQL API server at localhost:4000/graphql");