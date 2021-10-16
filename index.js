const express = require('express');
const cors = require('cors');
require('./datosApp.js')();
require('./sockets.js')();
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {cors:{origin: "*",}});
const port = 3030;
const portSocket = 3050;

console.clear();
app.use(express.urlencoded({extended: false, limit: '50mb'}));
app.use(express.json({limit: '50mb'}));
app.use(cors());
initSockets(io);
http.listen(portSocket, () => {
    console.log(`Socket server is listening on port ${portSocket}`);
})
app.listen(port, () => {
    console.log(`API server is listening on port ${port}`);
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
        empresa, nombre, primerApellido, segundoApellido, email, genero, dni, telefono, movil, nacimiento, direccion, fechaAlta, cargo, informacionComplementaria, administrador
    } = req.body;
    crearTrabajador(empresa, nombre, primerApellido, segundoApellido, email, genero, dni, telefono, movil, nacimiento, direccion, fechaAlta, cargo, informacionComplementaria, administrador).then((data) => {
        res.send(data);
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
app.post('/fichar', (req, res) => {
    let { empresa, idTrabajador, accion, lat, lon } = req.body;
    accionFichajeTrabajador(empresa, idTrabajador, accion, lat, lon).then((data) => {
        res.send(data);
    })
})
app.get('/informeMensual', (req, res) => {
    let { empresa, idTrabajador } = req.query;
    informeMensual(empresa, idTrabajador).then((data) => {
        res.send(data);
    })
})