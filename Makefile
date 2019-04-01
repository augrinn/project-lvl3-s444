install:
	npm install

start:
	npx babel-node -- src/bin/savepage.js

lint:
	npx eslint .
	
publish:
	npm publish

test:
	npm test
test-coverage:
	npm test -- --coverage