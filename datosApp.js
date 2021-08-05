const conexion = require('./conexion');


module.exports = () => {
    crearUserCognito = async(nombre, email, sub) => {
        let sql = "SELECT DISTINCT name FROM sys.databases WHERE name LIKE 'Fac%' AND name NOT LIKE '%_bak'AND name NOT IN ('Fac_Demo', 'Fac_Prueba')";
        let empresas = await conexion.recHit('Hit', sql);
        let empresa = undefined, idTrabajador = undefined;
        for(let indexEmpresa in empresas.recordset) {
            let {name} = empresas.recordset[indexEmpresa];
            let usersMailsAndIds = await conexion.recHit(name, "SELECT id, valor FROM dependentesextes WHERE nom = 'EMAIL' AND valor NOT LIKE ''");
            for(let indexCorreo in usersMailsAndIds.recordset) {
                if(email === usersMailsAndIds.recordset[indexCorreo].valor) {
                    empresa = name;
                    idTrabajador = usersMailsAndIds.recordset[indexCorreo].id;
                    break;
                }
            }
            if(empresa !== undefined) break;
        }
        await conexion.recHit('Hit', `INSERT INTO cognitoUsersSUB (idTrabajador, nombre, mail, empresa, SUB) VALUES (${idTrabajador}, '${nombre}', '${email}', '${empresa}', '${sub}')`);
    }
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
    fichajesUser = async (sub) => {
        let userInfo = await conexion.recHit('Hit', `SELECT idTrabajador, empresa FROM cognitoUsersSUB WHERE sub = '${sub}'`);
        let {idTrabajador, empresa} = userInfo.recordset[0];
        let sql = `
            SELECT tmst as fichaje FROM (SELECT TOP 1 * FROM cdpDadesFichador WHERE usuari = ${idTrabajador} AND accio = 1 ORDER BY tmst DESC) AS a 
            UNION ALL
            SELECT tmst as fichaje FROM(SELECT TOP 1 * FROM cdpDadesFichador WHERE usuari = ${idTrabajador} AND accio = 2 ORDER BY tmst DESC) AS b
        `;
        let ultimosFichajes = await conexion.recHit(empresa, sql);
        return {
            ultimoFichajeEntrada: ultimosFichajes.recordset[0].fichaje,
            ultimoFichajeSalida: ultimosFichajes.recordset[1].fichaje
        }
    }
}