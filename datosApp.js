const conexion = require('./conexion');


module.exports = () => {
    listarUsuarios = async (empresa) => {
        let usuarios = await conexion.recHit(`Fac_${empresa}`, 'SELECT * FROM Dependentes');
        let dataUsuarios = [];
        for(let user in usuarios.recordset) {
            let {CODI:codi, NOM:nom, MEMO:memo} = usuarios.recordset[user];
            let dataUsuario = {
                id: codi,
                nombre: nom,
                nombreLargo: memo
            }
            dataUsuarios.push(dataUsuario);
        }
        return dataUsuarios;
    };
    listarUser = async (empresa, nombre) => {
        let user = await conexion.recHit(`Fac_${empresa}`, `SELECT CODI FROM Dependentes WHERE NOM like '${nombre}%'`);
        console.log(user);
    }
}