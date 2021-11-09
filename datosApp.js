const conexion = require('./conexion');
const bcrypt = require('bcryptjs');

module.exports = () => {
    iniciarSesionGoogle = async (email, givenName, googleId, name) => {
        const checkGoogleId = `SELECT token FROM FichajePorVoz_Usuarios WHERE token = '${googleId}'`;
        const result = await conexion.recHit('Hit', checkGoogleId);
        if(result.recordset.length <= 0) {
            const sql = "SELECT DISTINCT name FROM sys.databases WHERE name LIKE 'Fac%' AND name NOT LIKE '%_bak'AND name NOT IN ('Fac_Demo', 'Fac_Prueba')";
            const empresas = await conexion.recHit('Hit', sql);
            let empresa = undefined, idTrabajador = undefined;
            for(let indexEmpresa in empresas.recordset) {
                let { name } = empresas.recordset[indexEmpresa];
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
            if(idTrabajador === undefined) return 403;
            const sqlNewUser = `INSERT INTO FichajePorVoz_Usuarios (idTrabajador, nombre, mail, empresa, googleId) VALUES (${idTrabajador}, '${givenName}', '${email}', '${empresa}', '${googleId}')`;
            await conexion.recHit('Hit', sqlNewUser);
        }
        const userData = `SELECT * FROM FichajePorVoz_Usuarios WHERE googleId = '${googleId}'`;
        let { accionUltimoFichaje, accionUltimoDescanso } = await ultimasAccionesFichajes(idTrabajador, empresa);
        const data = await conexion.recHit('Hit', userData);
        data.recordset[0].accionUltimoFichaje = accionUltimoFichaje;
        data.recordset[0].accionUltimoDescanso = accionUltimoDescanso;
        return data.recordset[0];
    }
    iniciarSesion = async (email, passwd) => {
        const sql = `SELECT * FROM FichajePorVoz_Usuarios WHERE mail = '${email}'`;
        const result = await conexion.recHit('Hit', sql);
        if(result.recordset.length <= 0) return 410; // El mail no existe
        const correctPasswd = bcrypt.compareSync(passwd, result.recordset[0].passwd);
        if(!correctPasswd) return 403; // Contraseña incorrecta
        console.log(result.recordset[0])
        let { accionUltimoFichaje, accionUltimoDescanso } = await ultimasAccionesFichajes(result.recordset[0].idTrabajador, result.recordset[0].empresa);
        result.recordset[0].accionUltimoFichaje = accionUltimoFichaje;
        result.recordset[0].accionUltimoDescanso = accionUltimoDescanso;
        return result.recordset[0];
    }
    crearUserCognito = async(nombre, email, sub) => {
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
    userData = async (id) => {
        let userData = await conexion.recHit('Hit', `SELECT * FROM FichajePorVoz_Usuarios WHERE googleId = '${id}'`);
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
                SELECT CAST(tmst AS Date) AS fecha, DATEPART(hour, tmst) AS hora, DATEPART(minute, tmst) AS minutos, accio, idr, comentari, nom FROM cdpDadesFichador
                JOIN Dependentes ON usuari = Dependentes.CODI
                WHERE DATEPART(hour, tmst) > ${horaMinima} AND DATEPART(hour, tmst) < ${horaMaxima}
                AND MONTH(tmst) = ${mes} AND YEAR(tmst) = ${year}
                ORDER BY tmst DESC
            `;
        } else {
            sql = `
                SELECT CAST(tmst AS Date) AS fecha, DATEPART(hour, tmst) AS hora, DATEPART(minute, tmst) AS minutos, accio, idr,comentari, nom FROM cdpDadesFichador
                JOIN Dependentes ON usuari = Dependentes.CODI
                WHERE usuari = ${trabajador} AND DATEPART(hour, tmst) > ${horaMinima} AND DATEPART(hour, tmst) < ${horaMaxima}
                AND MONTH(tmst) = ${mes} AND YEAR(tmst) = ${year}
                ORDER BY tmst DESC
            `;
        }
        let datos = await conexion.recHit(empresa, sql);
        return datos.recordset;
    }
    crearTrabajador = async (empresa, nombre, primerApellido, segundoApellido, email, passwd, genero, dni, telefono, movil, nacimiento, direccion, fechaAlta, cargo, informacionComplementaria, administrador) => {
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
        await addTrabajadorTablaHit(newCodi, nombre, email, empresa, passwd);
        return {
            id: newCodi
        };
    }
    addTrabajadorTablaHit = async (idTrabajador, nombre, mail, empresa, passwd) => {
        const fechaActual = new Date().getTime().toString(36);
        const randomNumber = Math.random().toString(36).slice(2);
        const token = `ng${fechaActual}+${randomNumber}`;
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(passwd, salt);
        const sql = `INSERT INTO FichajePorVoz_Usuarios (idTrabajador, nombre, mail, empresa, token, passwd) VALUES (${idTrabajador}, '${nombre}', '${mail}', '${empresa}', '${token}', '${hash}')`;
        await conexion.recHit('Hit', sql);
    }
    datosTrabajador = async (empresa, idUsuario) => {
        let data = await conexion.recHit(empresa, `SELECT valor FROM dependentesExtes WHERE id = ${idUsuario} AND (nom = 'TLF_MOBIL' OR nom = 'ADRESA' OR nom = 'IMAGEN_FICHAJEPORVOZ') ORDER BY nom`);
        return {
            direccion: data.recordset[0] ? data.recordset[0].valor : '',
            imagen: data.recordset[1] ? data.recordset[1].valor : 'https://cdn.iconscout.com/icon/free/png-256/account-avatar-profile-human-man-user-30448.png',
            movil: data.recordset[2] ? data.recordset[2].valor : '',
        };
    }
    eventosCalendario = async (empresa, idTrabajador) => {
        let data;
        if(idTrabajador == 0) {
            data = await conexion.recHit(empresa, `SELECT id, tipoEvento as color, nombreEvento as title, principioEvento as 'from', finEvento as 'to' FROM Calendario_FichajePorVoz`);
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
    informe = async (empresa, idTrabajador, periodo, dia, mes, year) => {
        if(periodo == 0) return informeSemanal(empresa, idTrabajador, dia, mes, year);
        else if(periodo == 1) return informeMensual(empresa, idTrabajador, mes, year);
        else return informeAnual(empresa, idTrabajador, year);
    }
    informeMensual = async (empresa, idTrabajador, mes, year) => {
        const sql = `
            SELECT tmst, historial finEvento, accio, comentari FROM cdpDadesFichador
            WHERE usuari = ${idTrabajador} AND YEAR(tmst) = ${year} AND MONTH(tmst) = ${mes}
            UNION ALL
            SELECT principioEvento tmst, convert(nvarchar, finEvento, 120), tipoEvento accio, nombreevento comentari FROM Calendario_FichajePorVoz
            WHERE idTrabajador = ${idTrabajador} AND YEAR(principioEvento) = ${year} AND MONTH(principioEvento) = ${mes}
            ORDER BY tmst ASC
        `;
        let horas = await conexion.recHit(empresa, sql);
        let infoHoras = horas.recordset;
        let totalHoras = 0, totalMinutos = 0, totalSegundos = 0, totalDescanso = 0;
        let posibleFallo = false;
        //console.log(infoHoras);
        let tmstHoras = infoHoras.filter(t => t.finEvento === null).map(tt => tt);
        for(let i = 0; i < tmstHoras.length; i += 2) {
            if(tmstHoras[i] != null && tmstHoras[i+1] != null) {
                let diferenciaTiempo = new Date(tmstHoras[i+1].tmst) - new Date(tmstHoras[i].tmst);
                totalHoras += new Date(diferenciaTiempo).getHours()-1 + new Date(diferenciaTiempo).getMinutes()/60 + new Date(diferenciaTiempo).getSeconds()/3600;
                totalMinutos += (new Date(diferenciaTiempo).getHours()-1)*60 + new Date(diferenciaTiempo).getMinutes() + new Date(diferenciaTiempo).getSeconds()/60;
                totalSegundos += (new Date(diferenciaTiempo).getHours()-1)*3600 + new Date(diferenciaTiempo).getMinutes()*60 + new Date(diferenciaTiempo).getSeconds();
                if((tmstHoras[i].accio === 3 && tmstHoras[i+1].accio === 4) || (tmstHoras[i+1].accio === 3 && tmstHoras[i+2].accio === 4)) {
                    if(tmstHoras[i].accio === 3) {
                        diferenciaTiempo = new Date(tmstHoras[i+1].tmst) - new Date(tmstHoras[i].tmst);
                    } else {
                        diferenciaTiempo = new Date(tmstHoras[i+2].tmst) - new Date(tmstHoras[i+1].tmst);
                    }
                    totalDescanso += new Date(diferenciaTiempo).getHours()-1 + new Date(diferenciaTiempo).getMinutes()/60 + new Date(diferenciaTiempo).getSeconds()/3600;
                }
            } else {
                posibleFallo = true;
            }
        }
        const dataUser = await conexion.recHit(empresa, `SELECT * FROM dependentes WHERE codi = ${idTrabajador}`);
        return {
            horas: totalHoras.toFixed(2),
            minutos: totalMinutos.toFixed(2),
            segundos: totalSegundos.toString(),
            tiempoDescanso: totalDescanso.toFixed(2),
            error: posibleFallo,
            fichajes: infoHoras,
            infoTrabajador: dataUser.recordset,
            datosAcciones: await calcularHorasTotales(empresa, idTrabajador, 1, 0, mes, year),
            tipoInforme: 'mensual',
        };
    }
    informeAnual = async (empresa, idTrabajador, year) => {
        console.log('Entro en el informe')
        const sql = `
            SELECT tmst, historial finEvento, accio, comentari FROM cdpDadesFichador
            WHERE usuari = ${idTrabajador} AND YEAR(tmst) = ${year}
            UNION ALL
            SELECT principioEvento tmst, convert(nvarchar, finEvento, 120), tipoEvento accio, nombreevento comentari FROM Calendario_FichajePorVoz
            WHERE idTrabajador = ${idTrabajador} AND YEAR(principioEvento) = ${year}
            ORDER BY tmst ASC
        `;
        let horas = await conexion.recHit(empresa, sql);
        let infoHoras = horas.recordset;
        let totalHoras = 0, totalMinutos = 0, totalSegundos = 0, totalDescanso = 0;
        let posibleFallo = false;
        let tmstHoras = infoHoras.filter(t => t.finEvento === null).map(tt => tt);
        for(let i = 0; i < tmstHoras.length; i += 2) {
            if(tmstHoras[i] != null && tmstHoras[i+1] != null) {
                let diferenciaTiempo = new Date(tmstHoras[i+1].tmst) - new Date(tmstHoras[i].tmst);
                totalHoras += new Date(diferenciaTiempo).getHours()-1 + new Date(diferenciaTiempo).getMinutes()/60 + new Date(diferenciaTiempo).getSeconds()/3600;
                totalMinutos += (new Date(diferenciaTiempo).getHours()-1)*60 + new Date(diferenciaTiempo).getMinutes() + new Date(diferenciaTiempo).getSeconds()/60;
                totalSegundos += (new Date(diferenciaTiempo).getHours()-1)*3600 + new Date(diferenciaTiempo).getMinutes()*60 + new Date(diferenciaTiempo).getSeconds();
                if((tmstHoras[i].accio === 3 && tmstHoras[i+1].accio === 4) || (tmstHoras[i+1].accio === 3 && tmstHoras[i+2].accio === 4)) {
                    if(tmstHoras[i].accio === 3) {
                        diferenciaTiempo = new Date(tmstHoras[i+1].tmst) - new Date(tmstHoras[i].tmst);
                    } else {
                        diferenciaTiempo = new Date(tmstHoras[i+2].tmst) - new Date(tmstHoras[i+1].tmst);
                    }
                    totalDescanso += new Date(diferenciaTiempo).getHours()-1 + new Date(diferenciaTiempo).getMinutes()/60 + new Date(diferenciaTiempo).getSeconds()/3600;
                }
            } else {
                posibleFallo = true;
            }
        }
        const dataUser = await conexion.recHit(empresa, `SELECT * FROM dependentes WHERE codi = ${idTrabajador}`);
        return {
            horas: totalHoras.toFixed(2),
            minutos: totalMinutos.toFixed(2),
            segundos: totalSegundos.toString(),
            tiempoDescanso: totalDescanso.toFixed(2),
            error: posibleFallo,
            fichajes: infoHoras,
            infoTrabajador: dataUser.recordset,
            datosAcciones: await calcularHorasTotales(empresa, idTrabajador, 2, 0, 0, year),
            tipoInforme: 'anual',
        };
    }
    informeSemanal = async (empresa, idTrabajador, dia, mes, year) => {
        const sql = `
            SELECT tmst, historial finEvento, accio, comentari FROM cdpDadesFichador
            WHERE usuari = ${idTrabajador} AND YEAR(tmst) = ${year} AND MONTH(tmst) = ${mes} AND DAY(tmst) >= ${dia} AND DAY(tmst) <= ${Number(dia)+7}
            UNION ALL
            SELECT principioEvento tmst, convert(nvarchar, finEvento, 120), tipoEvento accio, nombreevento comentari FROM Calendario_FichajePorVoz
            WHERE idTrabajador = ${idTrabajador} AND YEAR(principioEvento) = ${year} AND MONTH(principioEvento) = ${mes} AND DAY(principioEvento) >= ${dia} AND DAY(finEvento) <= ${Number(dia)+7}
            ORDER BY tmst ASC
        `;
        let horas = await conexion.recHit(empresa, sql);
        let infoHoras = horas.recordset;
        let totalHoras = 0, totalMinutos = 0, totalSegundos = 0, totalDescanso = 0;
        let posibleFallo = false;
        //console.log(infoHoras);
        let tmstHoras = infoHoras.filter(t => t.finEvento === null).map(tt => tt);
        for(let i = 0; i < tmstHoras.length; i += 2) {
            if(tmstHoras[i] != null && tmstHoras[i+1] != null) {
                let diferenciaTiempo = new Date(tmstHoras[i+1].tmst) - new Date(tmstHoras[i].tmst);
                totalHoras += new Date(diferenciaTiempo).getHours()-1 + new Date(diferenciaTiempo).getMinutes()/60 + new Date(diferenciaTiempo).getSeconds()/3600;
                totalMinutos += (new Date(diferenciaTiempo).getHours()-1)*60 + new Date(diferenciaTiempo).getMinutes() + new Date(diferenciaTiempo).getSeconds()/60;
                totalSegundos += (new Date(diferenciaTiempo).getHours()-1)*3600 + new Date(diferenciaTiempo).getMinutes()*60 + new Date(diferenciaTiempo).getSeconds();
                if((tmstHoras[i].accio === 3 && tmstHoras[i+1].accio === 4) || (tmstHoras[i+1].accio === 3 && tmstHoras[i+2].accio === 4)) {
                    if(tmstHoras[i].accio === 3) {
                        diferenciaTiempo = new Date(tmstHoras[i+1].tmst) - new Date(tmstHoras[i].tmst);
                    } else {
                        diferenciaTiempo = new Date(tmstHoras[i+2].tmst) - new Date(tmstHoras[i+1].tmst);
                    }
                    totalDescanso += new Date(diferenciaTiempo).getHours()-1 + new Date(diferenciaTiempo).getMinutes()/60 + new Date(diferenciaTiempo).getSeconds()/3600;
                }
            } else {
                posibleFallo = true;
            }
        }
        const dataUser = await conexion.recHit(empresa, `SELECT * FROM dependentes WHERE codi = ${idTrabajador}`);
        return {
            horas: totalHoras.toFixed(2),
            minutos: totalMinutos.toFixed(2),
            segundos: totalSegundos.toString(),
            tiempoDescanso: totalDescanso.toFixed(2),
            error: posibleFallo,
            fichajes: infoHoras,
            infoTrabajador: dataUser.recordset,
            datosAcciones: await calcularHorasTotales(empresa, idTrabajador, 0, dia, mes, year),
            tipoInforme: 'semanal',
        };
    }
    calcularHorasTotales = async (empresa, idTrabajador, intervalo, dia, mes, year) => {
        const sql = `SELECT nom, valor FROM dependentesExtes WHERE nom LIKE 'hBase_%' AND id = ${idTrabajador} ORDER BY nom ASC`;
        const datos = await conexion.recHit(empresa, sql);
        if(datos.rowsAffected[0] === 0) {
            return null;
        }
        let sqlLibres;
        let diasTotales;
        if(intervalo == 0) {
            sqlLibres = `SELECT principioEvento, finEvento, tipoEvento FROM Calendario_FichajePorVoz WHERE idTrabajador = ${idTrabajador} AND MONTH(principioEvento) = ${mes} AND MONTH(finEvento) >= ${mes} AND DAY(principioEvento) >= ${dia} AND DAY(finEvento) <= ${dia+7}`;
            diasTotales = {
                0: 1,
                1: 1,
                2: 1,
                3: 1,
                4: 1,
                5: 1,
                6: 1,
            };
        } else if(intervalo == 1) {
            sqlLibres = `SELECT principioEvento, finEvento, tipoEvento FROM Calendario_FichajePorVoz WHERE idTrabajador = ${idTrabajador} AND MONTH(principioEvento) = ${mes}`;
            diasTotales = getTotalDiasMes();
        } else {
            sqlLibres = `SELECT principioEvento, finEvento, tipoEvento FROM Calendario_FichajePorVoz WHERE idTrabajador = ${idTrabajador} AND YEAR(principioEvento) = ${year} AND YEAR(finEvento) = ${year}`;
            diasTotales = getTotalDiasYear(year);
        }
        const diasNoTrabajados = await conexion.recHit(empresa, sqlLibres);
        const infoDias = diasNoTrabajados.recordset;
        let tipoDia = {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
        };
        console.log(infoDias);
        if(intervalo == 0) {
            const fichajeInicio = (new Date(year, mes-1, dia, 0, 0, 0, 0)).addDays(1);
            for(let dato in infoDias) {
                let fechaActual = new Date(infoDias[dato].principioEvento);
                let ultimaFecha = new Date(infoDias[dato].finEvento);
                tipoDia[infoDias[dato].tipoEvento] += 1;
                if(fichajeInicio >= fechaActual && fichajeInicio <= ultimaFecha) {
                    while(fechaActual <= ultimaFecha) {
                        diasTotales[fechaActual.getDay()] -= 1;
                        fechaActual = fechaActual.addDays(1);
                    }
                }
            }
        } else {
            for(let dato in infoDias) {
                let primeraFecha = new Date(infoDias[dato].principioEvento);
                let ultimaFecha = new Date(infoDias[dato].finEvento);
                let fechaActual = new Date(infoDias[dato].principioEvento);
                while(fechaActual <= ultimaFecha) {
                    if(fechaActual.getMonth() !== primeraFecha.getMonth()) break;
                    diasTotales[fechaActual.getDay()] -= 1;
                    tipoDia[infoDias[dato].tipoEvento] += 1;
                    fechaActual = fechaActual.addDays(1);
                }
            }
        }
        let horasPorDiaTotales = {
            lunes: datos.recordset[2].valor*diasTotales['1'],
            martes: datos.recordset[3].valor*diasTotales['2'],
            miercoles: datos.recordset[6].valor*diasTotales['3'],
            jueves: datos.recordset[1].valor*diasTotales['4'],
            viernes: datos.recordset[5].valor*diasTotales['5'],
            sabado: datos.recordset[4].valor*diasTotales['6'],
            domingo: datos.recordset[0].valor*diasTotales['0'],
        }
        const suma = Object.values(horasPorDiaTotales).reduce((a, b) => a + b);
        return {
            suma,
            tipoDia,
        };
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
    getTotalDiasYear = (year) => {
        var date = (new Date(year, 0, 1)).addDays(1);
        console.log(date)
        let diasTotales = {
            '0': 0,
            '1': 0,
            '2': 0,
            '3': 0,
            '4': 0,
            '5': 0,
            '6': 0,
        }
        while (date.getFullYear() == year) {
            diasTotales[date.getDay()] += 1;
            date.setDate(date.getDate() + 1);
        }
        return diasTotales;
    }
    actualizarComentario = async (empresa, fichajeId, comentario) => {
        await conexion.recHit(empresa, `UPDATE cdpDadesFichador SET comentari = comentari + '${comentario}' WHERE idr = '${fichajeId}'`);
        return 200;
    }
}