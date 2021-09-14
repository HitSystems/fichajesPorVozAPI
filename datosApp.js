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
        let usuarios = await conexion.recHit(empresa, 'SELECT * FROM Dependentes');
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
    userData = async (sub) => {
        let userData = await conexion.recHit('Hit', `SELECT * FROM cognitoUsersSUB WHERE sub = '${sub}'`);
        let {idTrabajador, nombre, mail, empresa} = userData.recordset[0];
        return {
            idTrabajador,
            nombre,
            mail,
            empresa
        }
    }
    fichajesUser = async (idTrabajador, empresa) => {
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
    totalTrabajadores = async (empresa) => {
        let total = await conexion.recHit(empresa, 'SELECT COUNT(Codi) as Total FROM Dependentes');
        return {
            total: total.recordset[0].Total
        };
    }
    trabajadoresActivos = async (empresa) => {
        let sql = 'SELECT usuari, tmst, NOM AS nom FROM cdpDadesFichador AS a INNER JOIN Dependentes AS b ON a.usuari = b.CODI WHERE tmst IN (SELECT MAX(tmst) FROM cdpDadesFichador GROUP BY usuari) AND accio = 1 AND CAST(tmst AS Date) = CAST(GETDATE() AS Date) ORDER BY tmst DESC';
        let trabajadoresActivos = await conexion.recHit(empresa, sql);
        return trabajadoresActivos.recordsets[0];
    }
    listarFichajes = async (empresa, trabajador, year, mes, franjaHoraria) => {
        console.log(empresa, trabajador, year, mes, franjaHoraria);
        let horaMaxima = 23, horaMinima = 0, sql = '';
        if(franjaHoraria == 1) {
            horaMinima = 5;
            horaMaxima = 14;
        } else if(franjaHoraria == 2) {
            horaMinima = 14;
            horaMaxima = 23;
        }
        if(trabajador == 0 || trabajador == 'Todos los trabajadores') {
            sql = `
                SELECT CAST(tmst AS Date) AS fecha, DATEPART(hour, tmst) AS hora, accio, nom FROM cdpDadesFichador
                JOIN Dependentes ON usuari = Dependentes.CODI
                WHERE DATEPART(hour, tmst) > ${horaMinima} AND DATEPART(hour, tmst) < ${horaMaxima}
                AND MONTH(tmst) = ${mes} AND YEAR(tmst) = ${year}
                ORDER BY tmst DESC
            `;
        } else {
            sql = `
                SELECT CAST(tmst AS Date) AS fecha, DATEPART(hour, tmst) AS hora, accio, nom FROM cdpDadesFichador
                JOIN Dependentes ON usuari = Dependentes.CODI
                WHERE usuari = ${trabajador} AND DATEPART(hour, tmst) > ${horaMinima} AND DATEPART(hour, tmst) < ${horaMaxima}
                AND MONTH(tmst) = ${mes} AND YEAR(tmst) = ${year}
                ORDER BY tmst DESC
            `;
        }
        let datos = await conexion.recHit(empresa, sql);
        console.log(datos.recordset);
        return datos.recordset;
    }
    crearTrabajador = async (empresa, nombre, primerApellido, segundoApellido, email, passwd, telefono, movil, nacimiento, direccion, fechaAlta, cargo, informacionComplementaria,administrador, imagen) => {
        let sqlMaxCODI = await conexion.recHit(empresa, 'SELECT MAX(CODI) as codi FROM Dependentes');
        console.log(sqlMaxCODI);
        let newCodi = (sqlMaxCODI.recordset[0].codi) + 1;
        console.log(newCodi);
        let sqlDependentes = `INSERT INTO Dependentes (CODI, NOM, MEMO, TELEFON, ADREÇA, Icona, [Hi Editem Horaris], Tid) VALUES (${newCodi},'${nombre} ${primerApellido} ${segundoApellido}', '${nombre}', ${movil}, '${direccion}', NULL, 1, NULL)`;
        conexion.recHit(empresa, sqlDependentes);
        let sqlDependentesExtes = `INSERT INTO DependentesExtes ()`;
        return 1;
    }
}