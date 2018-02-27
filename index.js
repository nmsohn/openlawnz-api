require('dotenv').config()

import joinMonster from 'join-monster'

import {
	GraphQLSchema,
	GraphQLObjectType,
	GraphQLList,
	GraphQLNonNull,
	GraphQLString,
	GraphQLInt
  } from 'graphql'

const express = require('express')
const mysql = require('mysql')
const graphqlHTTP = require('express-graphql')
const GraphQLDate = require('graphql-date')

const connection = mysql.createConnection({
	host     : process.env.DB_HOST,
	user     : process.env.DB_USER,
	password : process.env.DB_PASS,
	database : 'cases'
});

connection.connect();

const CaseType = new GraphQLObjectType({
	name: 'Case',
	sqlTable: 'cases',
	uniqueKey: 'id',
	fields: () => ({
		id: { 
			type: GraphQLInt
		},
		pdf_fetch_date: { 
			type: GraphQLDate
		},
		pdf_name: {
			type: GraphQLString
		},
		bucket_key: {
			type: GraphQLString
		},
		case_text: {
			type: GraphQLString
		},
		case_name: {
			type: GraphQLString
		},
		cited_by: {
			type: new GraphQLList(CaseType),
			junction: {
				sqlTable: 'case_to_case',
				sqlJoins: [
				  // first the parent table to the junction
				  (casesTable, junctionTable, args) => `${casesTable}.id = ${junctionTable}.case_id_1`,
				  // then the junction to the child
				  (junctionTable, citedByTable, args) => `${junctionTable}.case_id_2 = ${citedByTable}.id`
				]
			}
		},
		cites: {
			type: new GraphQLList(CaseType),
			junction: {
				sqlTable: 'case_to_case',
				sqlJoins: [
				  // first the parent table to the junction
				  (casesTable, junctionTable, args) => `${casesTable}.id = ${junctionTable}.case_id_2`,
				  // then the junction to the child
				  (junctionTable, citedByTable, args) => `${junctionTable}.case_id_1 = ${citedByTable}.id`
				]
			}
		}
	})
})

function dbCall(sql) {
	return new Promise(function(resolve, reject) {
		connection.query(sql, (err, results, fields) => {
			if(err) { reject(err); return; }
			resolve(results)
		})
	});
}

function standardResolver(parent, args, context, resolveInfo) {
	return joinMonster(resolveInfo, context, dbCall, { dialect: 'mysql' })
}

var QueryRoot = new GraphQLObjectType({
	name: 'Query',
	fields: {
		cases: {
			type: new GraphQLList(CaseType),
			resolve: standardResolver
		},
		case: {
			type: CaseType,
			args: {
			  id: {
				description: 'The case\'s ID number',
				type: new GraphQLNonNull(GraphQLInt)
			  }
			},
			// this function generates the WHERE condition
			where: (casesTable, args, context) => { // eslint-disable-line no-unused-vars
			  return `${casesTable}.id = ${args.id}`
			},
			resolve: standardResolver
		}
	}
});

var schema = new GraphQLSchema({query: QueryRoot});

var app = express();
app.use('/graphql', graphqlHTTP({
	schema: schema,
	graphiql: true,
}));
app.listen(4000);

console.log('Running a GraphQL API server at localhost:4000/graphql');
