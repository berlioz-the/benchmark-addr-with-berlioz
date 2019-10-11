const express = require('express')
const bodyParser = require('body-parser')
const fs = require('fs');
const Promise = require('promise');
const MySql = require('promise-mysql');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

const DBInfo = JSON.parse(fs.readFileSync(`${process.env.BERLIOZ_CONSUMES_PATH}/database/book.json`));
const DBConfig = DBInfo.config;
DBConfig.user = 'root';
DBConfig.password = '';
DBConfig.database = 'demo';
var DBConnection = null;

app.get('/', (request, response) => {
    var data = {
        myId: process.env.BERLIOZ_TASK_ID,
        message: 'Hello From App Tier'
    }
    response.send(data);
})

app.get('/entries', (request, response) => {
    return executeQuery('SELECT * FROM contacts')
        .then(contacts => {
            console.log("**** CONTACTS:")
            console.log(contacts);
            response.send(contacts);
        })
        .catch(reason => {
            console.log("**** ERROR:")
            console.log(reason);
            response.status(400).send({
               error: reason.message
            });
        })
})

app.post('/entry', (request, response) => {
    if (!request.body.name || !request.body.phone) {
        return response.send({error: 'Missing name or phone'});
    }
    var querySql = 'INSERT INTO contacts(name, phone) VALUES( ?, ? )';
    return executeQuery(querySql, [request.body.name, request.body.phone])
        .then(() => {
            response.send({ success: true });
        })
        .catch(reason => {
            response.status(400).send({
               error: reason.message
            });
        })
})

app.get('/debug', function (req, response) {
    var result = {
        db_config: DBConfig,
        consumes_metadata: {
            'all.json': JSON.parse(fs.readFileSync(`${process.env.BERLIOZ_CONSUMES_PATH}/all.json`)),
            'database/book.json': JSON.parse(fs.readFileSync(`${process.env.BERLIOZ_CONSUMES_PATH}/database/book.json`))
        },
        environment: process.env
    }
    response.send(result);
});

app.listen(process.env.BERLIOZ_LISTEN_PORT_DEFAULT,
           process.env.BERLIOZ_LISTEN_ADDRESS, (err) => {
    if (err) {
        return console.log('something bad happened', err)
    }

    console.log(`server is listening on ${process.env.BERLIOZ_LISTEN_ADDRESS}:${process.env.BERLIOZ_LISTEN_PORT_DEFAULT}`)
})

function executeQuery(querySql, inserts)
{
    console.log(`[executeQuery] query: ${querySql}, inserts: ${JSON.stringify(inserts)}`);
    return getConnection()
        .then(connection => connection.query(querySql, inserts))
        .then(result => {
            console.log(`Query ${querySql} result:`)
            console.log(result)
            return result;
        })
        .catch(reason => {
            console.log("*** SQL ERROR:");
            console.log(reason);
            throw reason;
        });
}

function getConnection()
{    
    if (global.DBConnection) {
        return Promise.resolve(global.DBConnection);
    }
    return MySql.createConnection(DBConfig)
        .then(connection => {
            global.DBConnection = connection;
            return global.DBConnection;
        })
}