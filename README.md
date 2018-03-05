## openlawnz-api

* Uses [GraphQL](http://graphql.org/) & [Join Monster](https://github.com/stems/join-monster) for SQL
* Has Babel compiling because of join-monster

## Setup

Requires Linux (maybe macOS)

Make a ```.env``` file with the database connection details.

	npm install
	npm run dev

Visit http://localhost:4000/graphql

## Deploy

	npm run build
	
Generates a zip file to upload
