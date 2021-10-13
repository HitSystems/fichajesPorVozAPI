const conexion = require('./conexion');

module.exports = () => {
    initSockets = async (io) => {
        io.on('connection', (socket) => {
            socket.on('imagenUsuario', (data) => {
                conexion.recHit(data.empresa, `INSERT INTO dependentesExtes VALUES (${data.id}, 'IMAGEN_FICHAJEPORVOZ', '${data.imagen}')`);
            });
        })
    }
}