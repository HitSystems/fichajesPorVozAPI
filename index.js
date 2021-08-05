const express = require('express');
const cors = require('cors');
require('./datosApp.js')();
const app = express();
const port = 3030;

app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.use(cors());

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
})

app.get('/', (req, res) => {
    res.send('Esto es la API de FichajesPorVoz');
});

app.get('/users', (req, res) => {
    listarUsuarios(req.query.empresa).then((data) => {
        res.send(data)
    })
})
app.get('/user', (req, res) => {
    listarUser(req.query.empresa, req.query.nombre).then((data) => {
        res.send(data);
    })
})
app.post('/cognitoNewUser', (req, res) => {
    let {nombre, email, sub} = req.body;
    crearUserCognito(nombre, email, sub).then(() => {
        res.send('Usuario creado');
    })
})
app.get('/fichajesUser', (req, res) => {
    fichajesUser(req.query.sub).then((data) => {
        res.send(data);
    })
})