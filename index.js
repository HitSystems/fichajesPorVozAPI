const express = require('express');
require('./datosApp.js')();
const app = express();
const port = 3000;

app.use(express.urlencoded({extended: false}));
app.use(express.json());

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