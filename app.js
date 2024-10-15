// Importamos las librerías necesarias
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt'); 

// Creamos la aplicación de Express
const app = express();

// Middleware para manejar datos en formato JSON y datos enviados a través de formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuramos la carpeta pública para servir archivos estáticos (CSS, imágenes, JS frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de la aplicación (Aquí se agregarán más rutas después)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); // Ruta para el archivo index.html
});

// Configuramos el puerto en el que correrá el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`El servidor está corriendo en http://localhost:${PORT}`);
});

// Importamos el paquete de MySQL
const mysql = require('mysql2');

// Importamos el paquete de sesiones de Express
const session = require('express-session');

// Configuración de la sesión
app.use(session({
    secret: 'tuSecretoDeSesion', // Cambia esto por una clave secreta
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Asegúrate de usar 'secure: true' si usas HTTPS
}));

// Configuramos la conexión a la base de datos MySQL
const db = mysql.createConnection({
    host: 'localhost',    // Cambia esto si tu base de datos está en otro servidor
    user: 'root',         // Usuario de la base de datos
    password: 'NOVa2901', // Contraseña del usuario de la base de datos
    database: 'spgmeta'   // Nombre de la base de datos
});

// Establecemos la conexión con la base de datos
db.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
    } else {
        console.log('Conexión a la base de datos MySQL establecida.');
    }
});


// Ruta para procesar el registro de un nuevo usuario
app.post('/validar', async (req, res) => {
    const { name, email, contrasena } = req.body; // Obtenemos los datos del formulario

    try {
        // Encriptar la contraseña antes de guardarla
        const hashedPassword = await bcrypt.hash(contrasena, 10);
        console.log('Contraseña encriptada:', hashedPassword); // Log para verificar el hash

        // Verificar si el correo ya existe en la base de datos
        const buscarQuery = "SELECT * FROM usuarios WHERE email = ?";
        db.query(buscarQuery, [email], (err, rows) => {
            if (err) {
                console.error('Error al buscar el correo:', err);
                return res.status(500).send('Error en el servidor');
            }

            if (rows.length > 0) {
                // Si el correo ya está registrado
                console.log('Ya existe una cuenta con este correo.');
                return res.status(400).send('El correo ya está registrado.');
            }

            // Si el correo no está registrado, insertamos el nuevo usuario
            const registrarQuery = "INSERT INTO usuarios (nombre, email, contrasena) VALUES (?, ?, ?)";
            db.query(registrarQuery, [name, email, hashedPassword], (err, result) => {
                if (err) {
                    console.error('Error al registrar el usuario:', err);
                    return res.status(500).send('Error en el servidor al registrar el usuario');
                }

                // Registro exitoso, redirigir al index.html
                console.log('Usuario registrado exitosamente.');
                return res.redirect('/');  // Redirigimos al usuario a la página de inicio
            });
        });
    } catch (error) {
        console.error('Error al encriptar la contraseña:', error);
        res.status(500).send('Error en el servidor');
    }
});

// Ruta para procesar el ingreso de un usuario
app.post('/ingresar', (req, res) => {
    const { email, contrasena } = req.body; // Obtenemos los datos del formulario

    // Verificamos si el usuario existe en la base de datos
    const buscarQuery = "SELECT * FROM usuarios WHERE email = ?";
    db.query(buscarQuery, [email], async (err, rows) => {
        if (err) {
            console.error('Error al buscar el usuario:', err);
            return res.status(500).send('Error en el servidor');
        }

        if (rows.length === 0) {
            // Si el correo no existe en la base de datos
            console.log('No existe una cuenta con este correo.');
            guardarRegistro(null, email, 'Fallido');
            return res.status(400).send('Correo o contraseña incorrectos.');
        }

        // Si el correo existe, obtenemos el usuario
        const usuario = rows[0];
        console.log('Usuario encontrado:', usuario);

        try {
            console.log('Contraseña ingresada:', contrasena); // Log para verificar la contraseña ingresada
            // Comparamos la contraseña encriptada con la ingresada
            const esContrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena);

            if (!esContrasenaValida) {
                console.log('Contraseña incorrecta.');
                guardarRegistro(usuario.ID_usuario, email, 'Fallido');
                return res.status(400).send('Correo o contraseña incorrectos.');
            }

            // Si el correo y la contraseña son correctos
            console.log('Inicio de sesión exitoso para el usuario:', usuario.nombre);

            // Guardamos el ID_usuario en la sesión
            req.session.ID_usuario = usuario.ID_usuario;

            // Guardamos un registro de intento exitoso
            guardarRegistro(usuario.ID_usuario, email, 'Exitoso');
            return res.redirect('/');  // Redirigimos al usuario a la página de inicio
        } catch (error) {
            console.error('Error al comparar la contraseña:', error);
            return res.status(500).send('Error en el servidor');
        }
    });
});


// Función para guardar el registro de inicio de sesión
function guardarRegistro(idUsuario, usuario, resultado) {
    const registrarQuery = "INSERT INTO registro (ID_usuario, usuario, contrasena, fecha_registro) VALUES (?, ?, ?, NOW())";
    // Aquí la contraseña se guarda como 'Fallido' o 'Exitoso' dependiendo del resultado
    const contrasenaGuardada = resultado === 'Exitoso' ? 'Contraseña validada' : 'Fallido';

    db.query(registrarQuery, [idUsuario, usuario, contrasenaGuardada], (err) => {
        if (err) {
            console.error('Error al registrar intento de inicio de sesión:', err);
        } else {
            console.log('Intento de inicio de sesión registrado correctamente.');
        }
    });
}

// Ruta para procesar el formulario de paquetes y guardar en la base de datos
app.post('/paquetes', (req, res) => {
    const { ID_paquete, descripcion, precio, accion } = req.body;

    const buscarPaqueteQuery = "SELECT * FROM paquetes WHERE ID_paquete = ?";
    
    db.query(buscarPaqueteQuery, [ID_paquete], (err, result) => {
        if (err) {
            console.error('Error al buscar el paquete:', err);
            return res.status(500).send('Error en el servidor');
        }

        if (result.length > 0) {
            // Si el paquete ya existe, actualizamos su información
            const actualizarPaqueteQuery = "UPDATE paquetes SET descripcion = ?, precio = ? WHERE ID_paquete = ?";
            db.query(actualizarPaqueteQuery, [descripcion, precio, ID_paquete], (err, result) => {
                if (err) {
                    console.error('Error al actualizar el paquete:', err);
                    return res.status(500).send('Error al actualizar el paquete');
                }
                console.log('Paquete actualizado exitosamente');
                // Redirigir según la acción recibida
                if (accion === 'reservar') {
                    res.redirect('/reservas.html');
                } else if (accion === 'pagar') {
                    res.redirect('/pagos.html');
                }
            });
        } else {
            // Si el paquete no existe, lo insertamos
            const insertarPaqueteQuery = "INSERT INTO paquetes (ID_paquete, descripcion, precio) VALUES (?, ?, ?)";
            db.query(insertarPaqueteQuery, [ID_paquete, descripcion, precio], (err, result) => {
                if (err) {
                    console.error('Error al insertar el paquete:', err);
                    return res.status(500).send('Error al insertar el paquete');
                }
                console.log('Paquete insertado exitosamente');
                // Redirigir según la acción recibida
                if (accion === 'reservar') {
                    res.redirect('/reservas.html');
                } else if (accion === 'pagar') {
                    res.redirect('/pagos.html');
                }
            });
        }
    });
});

// Ruta para procesar la reserva de un paquete
app.post('/reservar', (req, res) => {
    if (!req.session.ID_usuario) {
        return res.status(401).send('<script>alert("Debes estar logueado para hacer una reserva.");window.location.href="/login.html"</script>');
        // return res.status(401).json({ success: false, message: 'Debes estar logueado para hacer una reserva.' });
    }

    const ID_usuario = req.session.ID_usuario;
    const { origen, destino, fecha_ida, fecha_regreso, numero_pasajeros, tarjeta_turismo, deposito } = req.body;

    const insertarReservaQuery = "INSERT INTO reservas (ID_usuario, origen, destino, fecha_ida, fecha_regreso, numero_pasajeros, tarjeta_turismo, deposito) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
       

    db.query(insertarReservaQuery, [ID_usuario, origen, destino, fecha_ida, fecha_regreso, numero_pasajeros, tarjeta_turismo ? 1 : 0, deposito], (err, result) => {
        if (err) {
            console.error('Error al insertar la reserva:', err);
            return res.status(500).send('<script>alert("Error al realizar la reserva");window.location.href="/reservas.html"</script>');
        }
        return res.send('<script>alert("Reserva realizada satisfactoriamente");window.location.href="/index.html"</script>');
 
    });
});




app.get('/check-session', (req, res) => {
    if (req.session.ID_usuario) {
        return res.json({ loggedIn: true });
    } else {
        return res.json({ loggedIn: false });
    }
});


// Ruta para procesar el pago
app.post('/pagar', (req, res) => {
    const { ID_paquete, monto, metodo_pago } = req.body;

    // Verificar que se hayan completado todos los campos obligatorios
    if (!ID_paquete || !monto || !metodo_pago) {
        return res.status(400).json({ success: false, message: 'Por favor, complete todos los campos obligatorios.' });
    }

    // Consulta para insertar el pago en la base de datos
    const insertarPagoQuery = "INSERT INTO pagos (ID_paquete, monto, metodo_pago) VALUES (?, ?, ?)";
    
    db.query(insertarPagoQuery, [ID_paquete, monto, metodo_pago], (err, result) => {
        if (err) {
            console.error('Error al insertar el pago:', err);
            return res.status(500).json({ success: false, message: 'Error al procesar el pago. Intente nuevamente más tarde.' });
        }

        // En caso de éxito, redirigir a una página de confirmación o mostrar un mensaje
        return res.send('<script>alert("Pago realizado satisfactoriamente");window.location.href="/index.html"</script>');
    });
});











