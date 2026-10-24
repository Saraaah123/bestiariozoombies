// ===================================================
// THE WALKING SPINNER
// ===================================================

// ---------- 1. Personajes ----------
// Cada personaje tiene un id. Las imágenes se llaman:
//   assets/images/<id>_head.png, <id>_torso.png y <id>_legs.png
// Para cambiar personajes, cambia esta lista (y los nombres de las imágenes).
const personajes = [
  { id: 'arquera',     nombre: 'La Arquera' },
  { id: 'ballestero',  nombre: 'El Ballestero' },
  { id: 'espadachina', nombre: 'La Espadachina' },
  { id: 'pistolero',   nombre: 'El Pistolero' }
];

const partes = ['head', 'torso', 'legs'];

// Lista de imágenes de cada parte. Cada una guarda el id de su personaje.
const imagenes = { head: [], torso: [], legs: [] };
partes.forEach(function (parte) {
  personajes.forEach(function (p) {
    const ruta = 'assets/images/' + p.id + '_' + parte + '.png';
    imagenes[parte].push({ id: p.id, nombre: p.nombre, src: ruta });
    new Image().src = ruta;   // las carga antes para que no parpadeen
  });
});

// ---------- 2. Sonidos ----------
// Pon tus archivos en assets/sounds/ con estos nombres.
// Si no existen, suena un pitido sencillo en su lugar.
const sonidos = {
  girar:  'assets/sounds/spin.mp3',
  parar:  'assets/sounds/stop.mp3',
  zombie: 'assets/sounds/zombie.mp3',
  ganar:  'assets/sounds/win.mp3'
};

// Se crean todos los audios al empezar, así ya están cargados cuando hacen falta
const audios = {};
Object.keys(sonidos).forEach(function (nombre) {
  audios[nombre] = new Audio(sonidos[nombre]);
  audios[nombre].preload = 'auto';
});
audios.girar.loop = true;

let audioActual = null;   // sonido largo que está sonando
let timerGiro = null;     // para el pitido repetido del giro
let ctx = null;           // audio sintetizado (solo si falta un archivo)

// Los navegadores solo dejan sonar un audio si antes el usuario hizo clic.
// Con este truco, al hacer clic en GIRAR se "activan" los audios de resultado.
function activarAudios() {
  ['parar', 'zombie', 'ganar'].forEach(function (nombre) {
    const audio = audios[nombre];
    audio.muted = true;
    audio.play().then(function () {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
    }).catch(function () {
      audio.muted = false;
    });
  });
}

function tono(frecuencia, duracion, tipo, volumen, espera) {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  const osc = ctx.createOscillator();
  const vol = ctx.createGain();
  const inicio = ctx.currentTime + (espera || 0);
  osc.type = tipo;
  osc.frequency.value = frecuencia;
  vol.gain.setValueAtTime(volumen, inicio);
  vol.gain.exponentialRampToValueAtTime(0.001, inicio + duracion);
  osc.connect(vol);
  vol.connect(ctx.destination);
  osc.start(inicio);
  osc.stop(inicio + duracion);
}

// Pitidos de respaldo cuando no hay archivo de sonido
function pitido(nombre) {
  if (nombre === 'girar') {
    timerGiro = setInterval(function () {
      tono(150 + Math.random() * 80, 0.05, 'square', 0.08);
    }, 80);
  } else if (nombre === 'parar') {
    tono(120, 0.25, 'sine', 0.4);
  } else if (nombre === 'zombie') {
    tono(110, 1.2, 'sawtooth', 0.2);
    tono(80, 1.4, 'sawtooth', 0.15);
  } else if (nombre === 'ganar') {
    [523, 659, 784, 1047].forEach(function (f, i) {
      tono(f, 0.25, 'square', 0.12, i * 0.14);
    });
  }
}

function pararSonidos() {
  if (audioActual) { audioActual.pause(); audioActual.currentTime = 0; audioActual = null; }
  clearInterval(timerGiro);
}

function sonar(nombre) {
  if (nombre !== 'parar') pararSonidos();   // así no se mezclan los sonidos

  const audio = audios[nombre];

  // si el archivo no existe o no se pudo cargar, usa el pitido
  if (audio.error) {
    pitido(nombre);
    return;
  }

  audio.currentTime = 0;
  if (nombre !== 'parar') audioActual = audio;

  audio.play().catch(function (error) {
    if (error.name === 'NotSupportedError') {   // el archivo no existe
      if (audioActual === audio) audioActual = null;
      pitido(nombre);
    }
  });
}

// ---------- 3. Elementos de la página ----------
const botonGirar = document.getElementById('girar');
const mensaje = document.getElementById('mensaje');
const nombreGanador = document.getElementById('nombre');

const mensajesMalos = [
  '¡Has creado una nueva especie de caminante!',
  'Este experimento salió terriblemente mal.',
  'Parece que alguien mezcló los cuerpos en el apocalipsis.'
];

let girando = false;

function azar(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

function mostrar(parte, imagen) {
  document.getElementById('img-' + parte).src = imagen.src;
}

// Al empezar, cada parte muestra una imagen cualquiera
partes.forEach(function (parte) {
  mostrar(parte, azar(imagenes[parte]));
});

// ---------- 4. Girar la ruleta ----------
botonGirar.addEventListener('click', function () {
  if (girando) return;            // no se puede girar dos veces a la vez
  girando = true;
  botonGirar.disabled = true;
  document.body.className = '';
  mensaje.textContent = 'Girando...';
  nombreGanador.textContent = '';

  activarAudios();
  sonar('girar');

  const resultado = {};
  let detenidas = 0;

  partes.forEach(function (parte, i) {
    const caja = document.getElementById('caja-' + parte);
    caja.classList.add('girando');

    // cambia de imagen rápido mientras gira
    const cambio = setInterval(function () {
      mostrar(parte, azar(imagenes[parte]));
    }, 60);

    // cada parte se detiene en un momento distinto (0.3s, 0.55s y 0.8s)
    // Para cambiar la velocidad: el primer número es cuándo se detiene la
    // primera parte y el segundo cuánto después se detiene cada una (en milisegundos)
    setTimeout(function () {
      clearInterval(cambio);
      const final = azar(imagenes[parte]);
      mostrar(parte, final);
      resultado[parte] = final;
      caja.classList.remove('girando');

      detenidas++;
      if (detenidas === 3) pararSonidos();   // se apaga el sonido del giro
      sonar('parar');

      if (detenidas === 3) {
        setTimeout(function () { revisar(resultado); }, 200);
      }
    }, 300 + i * 250);
  });
});

// ---------- 5. Revisar si ganó ----------
// Se comparan los ids de las tres partes, no cómo se ven.
function revisar(r) {
  const gano = r.head.id === r.torso.id && r.torso.id === r.legs.id;

  if (gano) {
    document.body.className = 'ganaste';
    mensaje.textContent = '¡SOBREVIVISTE! ¡HAS RECONSTRUIDO AL PERSONAJE ORIGINAL!';
    nombreGanador.textContent = r.head.nombre;
    sonar('ganar');
  } else {
    document.body.className = 'perdiste';
    mensaje.textContent = azar(mensajesMalos);
    nombreGanador.textContent = '';
    sonar('zombie');
  }

  girando = false;
  botonGirar.disabled = false;
}