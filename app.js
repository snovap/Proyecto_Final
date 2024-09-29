let mysql = require("mysql2");


let conexion = mysql.createConnection({
    host: "127.0.0.1",
    database: "spgmeta",
    user: "root",
    password: "NOVa2901"
});

conexion.connect(function (err) {
    if (err) {
        throw err;
    }else{
        console.log("Conexión Exitosa");
    }
})

conexion.end()