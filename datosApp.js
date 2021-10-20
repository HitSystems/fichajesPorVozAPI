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
        let { accionUltimoFichaje, accionUltimoDescanso } = await ultimasAccionesFichajes(idTrabajador, empresa);
        return {
            idTrabajador,
            nombre,
            mail,
            empresa,
            accionUltimoFichaje,
            accionUltimoDescanso,
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
                SELECT CAST(tmst AS Date) AS fecha, DATEPART(hour, tmst) AS hora, DATEPART(minute, tmst) AS minutos, accio, nom, comentari FROM cdpDadesFichador
                JOIN Dependentes ON usuari = Dependentes.CODI
                WHERE DATEPART(hour, tmst) > ${horaMinima} AND DATEPART(hour, tmst) < ${horaMaxima}
                AND MONTH(tmst) = ${mes} AND YEAR(tmst) = ${year}
                ORDER BY tmst DESC
            `;
        } else {
            sql = `
                SELECT CAST(tmst AS Date) AS fecha, DATEPART(hour, tmst) AS hora, DATEPART(minute, tmst) AS minutos, accio, nom, comentari FROM cdpDadesFichador
                JOIN Dependentes ON usuari = Dependentes.CODI
                WHERE usuari = ${trabajador} AND DATEPART(hour, tmst) > ${horaMinima} AND DATEPART(hour, tmst) < ${horaMaxima}
                AND MONTH(tmst) = ${mes} AND YEAR(tmst) = ${year}
                ORDER BY tmst DESC
            `;
        }
        let datos = await conexion.recHit(empresa, sql);
        return datos.recordset;
    }
    crearTrabajador = async (empresa, nombre, primerApellido, segundoApellido, email, genero, dni, telefono, movil, nacimiento, direccion, fechaAlta, cargo, informacionComplementaria, administrador, imagen) => {
        let sqlMaxCODI = await conexion.recHit(empresa, 'SELECT MAX(CODI) as codi FROM Dependentes');
        let newCodi = (sqlMaxCODI.recordset[0].codi) + 1;
        let sqlDependentes = `INSERT INTO Dependentes (CODI, NOM, MEMO, TELEFON, ADREÇA, Icona, [Hi Editem Horaris], Tid) VALUES (${newCodi},'${nombre} ${primerApellido} ${segundoApellido}', '${nombre}', ${movil}, '${direccion}', NULL, 1, NULL)`;
        conexion.recHit(empresa, sqlDependentes);
        let sqlDependentesExtes = `INSERT INTO DependentesExtes VALUES 
                                   (${newCodi}, 'TLF_MOBIL', '${movil}'),
                                   (${newCodi}, 'SEXE', '${genero}'),
                                   (${newCodi}, 'DNI', '${dni}'),
                                   (${newCodi}, 'DATA_NAIXEMENT', '${nacimiento.replace(/-/g, '/')}'),
                                   (${newCodi}, 'EMAIL', '${email}'),
                                   (${newCodi}, 'FECHA_ALTA', '${fechaAlta}'),
                                   (${newCodi}, 'CARGO', '${cargo}'),
                                   (${newCodi}, 'INFORMACION_COMPLEMENTARIA', '${informacionComplementaria}'),
                                   (${newCodi}, 'TELEFONO', '${telefono}')`;
        if(administrador) sqlDependentesExtes += `, (${newCodi}, 'TIPUSTREBALLADOR', 'GERENT')`;
        await conexion.recHit(empresa, sqlDependentesExtes);
        return {
            id: newCodi
        };
    }
    datosTrabajador = async (empresa, idUsuario) => {
        let data = await conexion.recHit(empresa, `SELECT valor FROM dependentesExtes WHERE id = ${idUsuario} AND (nom = 'TLF_MOBIL' OR nom = 'ADRESA' OR nom = 'IMAGEN_FICHAJEPORVOZ') ORDER BY nom`);
        return {
            direccion: data.recordset[0] !== null ? data.recordset[0].valor : '',
            imagen: data.recordset[1] !== null ? data.recordset[1].valor : 'https://media-exp3.licdn.com/dms/image/C4D0BAQHmN_j9JghpIA/company-logo_200_200/0/1591341525462?e=2159024400&v=beta&t=qruY0BBlI1LtzqfcOo9UOtJNKITx_0Rc9wJY8RhC-Og',
            movil: data.recordset[2].valor,
        };
    }
    eventosCalendario = async (empresa, idTrabajador) => {
        let data;
        if(idTrabajador == 0) {
            data = await conexion.recHit(empresa, `SELECT id, tipoEvento as color, nombreEvento as title, principioEvento as 'from', finEvento as 'to' FROM Calendario_FichajePorVoz`);
            console.log(data);
        } else {
            data = await conexion.recHit(empresa, `SELECT tipoEvento as color, nombreEvento as title, principioEvento as 'from', finEvento as 'to' FROM Calendario_FichajePorVoz WHERE idTrabajador = ${idTrabajador}`);
        }
        let datos = data.recordset.map((item) => {
            item.color = item.color == 1 ? '#57d64b' :
                         item.color == 2 ? '#3cf0e4' :
                         item.color == 3 ? '#f09e54' : '#f27166';
            return item;
        })
        return datos;
    }
    nuevoEventoCalendario = async (empresa, idTrabajador, tipoEvento, nombreEvento, principioEvento, finEvento) => {
        let sql = `INSERT INTO Calendario_FichajePorVoz (idTrabajador, tipoEvento, nombreEvento, principioEvento, finEvento) VALUES (${idTrabajador}, ${tipoEvento}, '${nombreEvento}', '${principioEvento}', '${finEvento}')`;
        await conexion.recHit(empresa, sql);
        return 1;
    }
    ultimasAccionesFichajes = async (idTrabajador, empresa) => {
        let accionUltimoFichaje = await conexion.recHit(empresa, `SELECT TOP 1 accio FROM cdpDadesFichador WHERE usuari = ${idTrabajador} AND (accio = 1 OR accio = 2) GROUP BY tmst, usuari, accio ORDER BY tmst DESC`);
        let accionUltimoDescanso = await conexion.recHit(empresa, `SELECT TOP 1 accio FROM cdpDadesFichador WHERE usuari = ${idTrabajador} AND (accio = 3 OR accio = 4) GROUP BY tmst, usuari, accio ORDER BY tmst DESC`)
        return {
            accionUltimoFichaje: accionUltimoFichaje.recordset[0] != null ? accionUltimoFichaje.recordset[0].accio : 2,
            accionUltimoDescanso: accionUltimoDescanso.recordset[0] != null ? accionUltimoDescanso.recordset[0].accio : 4,
        }
    }
    accionFichajeTrabajador = async (empresa, idTrabajador, accion, lat, lon) => {
        await conexion.recHit(empresa, `INSERT INTO cdpDadesFichador VALUES (0, getdate(), ${accion}, ${idTrabajador}, newid(), NULL, NULL, 1, '[Desde: FichajePorVoz][${lat},${lon}]')`);
        let { accionUltimoFichaje, accionUltimoDescanso } = await ultimasAccionesFichajes(idTrabajador, empresa);
        return {
            accionUltimoFichaje,
            accionUltimoDescanso,
        };
    }
    informeMensual = async (empresa, idTrabajador) => {
        const sql = `
            SELECT tmst, historial finEvento, accio, comentari FROM cdpDadesFichador
            WHERE usuari = ${idTrabajador} AND YEAR(tmst) = ${new Date().getFullYear()} AND MONTH(tmst) = ${new Date().getMonth()+1}
            UNION ALL
            SELECT principioEvento tmst, convert(nvarchar, finEvento, 120), tipoEvento accio, nombreevento comentari FROM Calendario_FichajePorVoz
            WHERE idTrabajador = ${idTrabajador} AND YEAR(principioEvento) = ${new Date().getFullYear()} AND MONTH(principioEvento) = ${new Date().getMonth()+1}
            ORDER BY tmst ASC
        `
        let horas = await conexion.recHit(empresa, sql);
        let infoHoras = horas.recordset;
        let totalHoras = 0, totalMinutos = 0, totalSegundos = 0;
        let posibleFallo = false;
        //console.log(infoHoras);
        let tmstHoras = infoHoras.filter(t => t.finEvento === null).map(tt => tt);
        for(let i = 0; i < tmstHoras.length; i += 2) {
            if(tmstHoras[i] != null && tmstHoras[i+1] != null) {
                let diferenciaTiempo = new Date(tmstHoras[i+1].tmst) - new Date(tmstHoras[i].tmst);
                totalHoras += new Date(diferenciaTiempo).getHours()-1 + new Date(diferenciaTiempo).getMinutes()/60 + new Date(diferenciaTiempo).getSeconds()/3600;
                totalMinutos += (new Date(diferenciaTiempo).getHours()-1)*60 + new Date(diferenciaTiempo).getMinutes() + new Date(diferenciaTiempo).getSeconds()/60;
                totalSegundos += (new Date(diferenciaTiempo).getHours()-1)*3600 + new Date(diferenciaTiempo).getMinutes()*60 + new Date(diferenciaTiempo).getSeconds();
            } else {
                posibleFallo = true;
            }
        }
        const dataUser = await conexion.recHit(empresa, `SELECT * FROM dependentes WHERE codi = ${idTrabajador}`);
        return {
            horas: totalHoras.toFixed(2),
            minutos: totalMinutos.toFixed(2),
            segundos: totalSegundos.toString(),
            error: posibleFallo,
            fichajes: infoHoras,
            infoTrabajador: dataUser.recordset,
            horasTotalesMes: await calcularHorasTotales(empresa, idTrabajador, 4),
        };
    }
    getInformeMensual = async (empresa, idTrabajador) => {

    }
    calcularHorasTotales = async (empresa, idTrabajador, intervalo) => {
        const sql = `SELECT nom, valor FROM dependentesExtes WHERE nom LIKE 'hBase_%' AND id = ${idTrabajador} ORDER BY nom ASC`;
        const datos = await conexion.recHit(empresa, sql);
        if(datos.recordset[0] === null) {
            return null;
        }
        let { TotalHoras:totalHoras } = datos.recordset[0];
        let diasTotales = getTotalDiasMes();
        /*if(intervalo === 1) {
            getInformeSemanal(empresa, idTrabajador);
        } else if(intervalo === 2) {
            getInformeMensual(empresa, idTrabajador);
        } else {
            getInformeAnual(empresa, idTrabajador);
        }*/
        const sqlLibres = `SELECT principioEvento, finEvento, tipoEvento FROM Calendario_FichajePorVoz WHERE idTrabajador = ${idTrabajador}`;
        const diasNoTrabajados = await conexion.recHit(empresa, sqlLibres);
        const infoDias = diasNoTrabajados.recordset;
        for(let dato in infoDias) {
            console.log(infoDias[dato]);
            let fechaActual = new Date(infoDias[dato].principioEvento);
            let ultimaFecha = new Date(infoDias[dato].finEvento);
            while(fechaActual <= ultimaFecha) {
                diasTotales[fechaActual.getDay()] -= 1;
                fechaActual = fechaActual.addDays(1);
            }
        }
        const horasPorDiaTotales = {
            lunes: datos.recordset[2].valor*diasTotales['1'],
            martes: datos.recordset[3].valor*diasTotales['2'],
            miercoles: datos.recordset[6].valor*diasTotales['3'],
            jueves: datos.recordset[1].valor*diasTotales['4'],
            viernes: datos.recordset[5].valor*diasTotales['5'],
            sabado: datos.recordset[4].valor*diasTotales['6'],
            domingo: datos.recordset[0].valor*diasTotales['0'],
        }
        const sumaMes = Object.values(horasPorDiaTotales).reduce((a, b) => a + b)
        //console.log(horasPorDiaTotales);
        //console.log(diasTotales);
        return sumaMes;
    }
    getTotalDiasMes = () => {
        const year = new Date().getFullYear();
        const month = new Date().getMonth();
        var date = new Date(year, month, 1);
        let diasTotales = {
            '0': 0,
            '1': 0,
            '2': 0,
            '3': 0,
            '4': 0,
            '5': 0,
            '6': 0,
        }
        while (date.getMonth() == month) {
            diasTotales[date.getDay()] += 1;
            date.setDate(date.getDate() + 1);
        }
        return diasTotales;
    }
}