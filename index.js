const express = require('express');
const cors = require('cors');
require('./datosApp.js')();
const app = express();
const port = 3030;

console.clear();
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
app.get('/userData', (req, res) => {
    userData(req.query.sub).then((data) => {
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
app.get('/totalTrabajadores', (req, res) => {
    totalTrabajadores(req.query.empresa).then((data) => {
        res.send(data);
    })
})
app.get('/trabajadoresActivos', (req, res) => {
    trabajadoresActivos(req.query.empresa).then((data) => {
        res.send(data);
    })
})
app.get('/fichajes', (req, res) => {
    let {empresa, trabajador, year, mes, franjaHoraria} = req.query;
    listarFichajes(empresa, trabajador, year, mes, franjaHoraria).then(data => {
        res.send(data);
    })
})
app.post('/nuevoTrabajador', (req, res) => {
    let {
        empresa, nombre, primerApellido, segundoApellido, email, passwd, telefono, movil, nacimiento, direccion, fechaAlta, cargo, informacionComplementaria, administrador, imagen
    } = req.body;
    crearTrabajador(empresa, nombre, primerApellido, segundoApellido, email, passwd, telefono, movil, nacimiento, direccion, fechaAlta, cargo, informacionComplementaria, administrador, imagen).then((data) => {
        res.send('hola');
    })
})
app.get('/datosTrabajador', (req, res) => {
    datosTrabajador(req.query.empresa, req.query.idUsuario).then((data) => {
        res.send(data);
    })
})
app.get('/eventosCalendario', (req, res) => {
    eventosCalendario(req.query.empresa, req.query.idTrabajador).then((data) => {
        res.send(data);
    })
})
app.post('/nuevoEventoCalendario', (req, res) => {
    let { empresa, idTrabajador, tipoEvento, nombreEvento, principioEvento, finEvento } = req.body;
    nuevoEventoCalendario(empresa, idTrabajador, tipoEvento, nombreEvento, principioEvento, finEvento).then((data) => {
        console.log('Evento creado');
        res.sendStatus(200);
    })
})