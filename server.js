const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');

const db = knex({
    client: 'pg',
    connection: {
        host: 'localhost',
        user: 'toshiro',
        password: '',
        database: 'face-finder'
    }
});

let database = {
    "email": "ann@gmail.com",
	"password": "apples",
	"name": "Ann"
}

const app = express();

app.use(bodyParser.json());
app.use(cors());

app.get('/', (request, response) => {
    response.send(database.users);
})

app.post('/register', (request, response) => {
    
    const { email, name, password} = request.body;
    const hash = bcrypt.hashSync(password);

    db.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email
        })
        .into('login')
        .returning('email')
        .then(loginEmail => {
            return trx('users')
                .returning('*')
                .insert({
                    email: loginEmail[0],
                    name: name,
                    joined: new Date()
                })
            .then(user => {
                response.json(user[0]);
            })
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })
    .catch(err => response.status(400).json('email already in use'))
    
})

app.post('/signin', (request, response) => {
    db.select('email', 'hash').from('login')
    .where('email', '=', request.body.email)
    .then(data => {
        const isValid = bcrypt.compareSync(request.body.password, data[0].hash);
        console.log(isValid);
        if(isValid) {
            return db.select('*').from('users')
                .where('email', '=', request.body.email)
                .then(user => {
                    console.log(user);
                    response.json(user[0])
                })
                .catch(err => response.status(400).json('unable to get user'))
        } else {
            response.status(400).json('wrong credentials')
        }
    })
    .catch(err => response.status(400).json('wrong credentials'))
})

app.get('/profile/:id', (request, response) => {
    const { id } = request.params;
    db.select('*').from('users').where({id}).then(user => {
        if(user.length) {
            response.json(user[0]);
        } else {
            response.status(400).json('No user found');
        }
    })
    .catch(err => response.status(400).json('user not found'));
})

app.put('/image', (request, response) => {
    const { id } = request.body;
    db('users').where('id', '=', id)
        .increment('entries', 1)
        .returning('entries')
        .then(entries => {
            response.json(entries[0])
        })
        .catch(err => response.status(400).json('error updating entries'))
})

app.listen(3000, () => {
    console.log('app is running on port 3000');
})