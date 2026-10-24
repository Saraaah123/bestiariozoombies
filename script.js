

const personajes = [
  { id: 'arquera',     nombre: 'La Arquera' },
  { id: 'ballestero',  nombre: 'El Ballestero' },
  { id: 'espadachina', nombre: 'La Espadachina' },
  { id: 'pistolero',   nombre: 'El Pistolero' }
];

const partes = ['head', 'torso', 'legs'];


const imagenes = { head: [], torso: [], legs: [] };
partes.forEach(function (parte) {
  personajes.forEach(function (p) {
    const ruta = 'assets/images/' + p.id + '_' + parte + '.png';
    imagenes[parte].push({ id: p.id, nombre: p.nombre, src: ruta });
    new Image().src = ruta;   
  });
});


const sonidos = {
  girar:  'assets/sounds/spin.mp3',
  parar:  'assets/sounds/stop.mp3',
  zombie: 'assets/sounds/zombie.mp3',
  ganar:  'assets/sounds/win.mp3'
};

let audioActual = null;   
let timerGiro = null;     
let ctx = null;           

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
  if (audioActual) { audioActual.pause(); audioActual = null; }
  clearInterval(timerGiro);
}

function sonar(nombre) {
  if (nombre !== 'parar') pararSonidos();  

  const audio = new Audio(sonidos[nombre]);
  if (nombre === 'girar') audio.loop = true;
  if (nombre !== 'parar') audioActual = audio;

  
  audio.play().catch(function (error) {
    if (error.name === 'AbortError') return;   
    if (audioActual === audio) audioActual = null;
    pitido(nombre);
  });
}


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


partes.forEach(function (parte) {
  mostrar(parte, azar(imagenes[parte]));
});


botonGirar.addEventListener('click', function () {
  if (girando) return;            
  girando = true;
  botonGirar.disabled = true;
  document.body.className = '';
  mensaje.textContent = 'Girando...';
  nombreGanador.textContent = '';

  sonar('girar');

  const resultado = {};
  let detenidas = 0;

  partes.forEach(function (parte, i) {
    const caja = document.getElementById('caja-' + parte);
    caja.classList.add('girando');

    
    const cambio = setInterval(function () {
      mostrar(parte, azar(imagenes[parte]));
    }, 60);

    
    setTimeout(function () {
      clearInterval(cambio);
      const final = azar(imagenes[parte]);
      mostrar(parte, final);
      resultado[parte] = final;
      caja.classList.remove('girando');

      detenidas++;
      if (detenidas === 3) pararSonidos();   
      sonar('parar');

      if (detenidas === 3) {
        setTimeout(function () { revisar(resultado); }, 400);
      }
    }, 700 + i * 500);
  });
});


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
