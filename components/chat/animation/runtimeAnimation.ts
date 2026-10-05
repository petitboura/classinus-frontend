// Code exécuté DANS l'iframe du lecteur d'animation guidée (29/09/2026,
// demande Bourama). Ce texte est injecté tel quel par
// construireDocumentAnimation.ts : l'iframe est un document séparé, il ne
// peut rien importer de l'application.
//
// Principe : le modèle décrit une ou plusieurs parties, chacune est une fonction de sa
// progression p (0 à 1). À chaque image, le lecteur remet d'abord tout
// dans l'état posé par installer(), puis applique dans l'ordre les
// parties déjà passées (p vaut 1) et la partie en cours (p courant).
// Les parties peuvent être déclarées après installer() ou à l'intérieur (04/10/2026).
// Les parties à venir ne sont pas appelées. La pause, le retour en
// arrière, le saut de partie et la barre de progression sont ainsi
// exacts, sans aucun état mémorisé par le modèle.
//
// Écrit en JS simple (sans backtick ni interpolation) pour tenir dans un
// String.raw.
export const RUNTIME_ANIMATION = String.raw`
(function () {
  var CONF = window.__ANIM_CONF;
  var T = CONF.textes;
  var C = CONF.palette;
  var NS = 'http://www.w3.org/2000/svg';
  var LARGEUR = 640;
  var HAUTEUR = 360;
  var CLES_CONSERVEES = { viewBox: 1, pathLength: 1, preserveAspectRatio: 1 };

  function $(id) { return document.getElementById(id); }
  function borne(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }
  function ease(x) { x = borne(x); return x * x * (3 - 2 * x); }
  function seg(p, a, b) { return ease((p - a) / (b - a)); }
  function lerp(a, b, x) { return a + (b - a) * x; }
  function arrondi(v) { return Math.round(v * 1000) / 1000; }
  function fusion(a, b) { var r = {}; var k; for (k in a) { r[k] = a[k]; } for (k in b) { r[k] = b[k]; } return r; }

  var NOMBRE = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
  function mixerChemin(d1, d2, x) {
    var s1 = String(d1);
    var n1 = s1.match(NOMBRE) || [];
    var n2 = String(d2).match(NOMBRE) || [];
    if (n1.length !== n2.length) { return x < 0.5 ? d1 : d2; }
    var i = 0;
    return s1.replace(NOMBRE, function (m) { return arrondi(lerp(parseFloat(m), parseFloat(n2[i++]), x)); });
  }

  var etat = { mode: '2d', restaurer: null, installeur: null, parties: [], S: null, t: 0, duree: 0, joue: false, dernier: 0, idx: -1, pret: false };

  window.mode = function (m) { etat.mode = (m === '3d') ? '3d' : '2d'; };
  window.installer = function (fn) { etat.installeur = fn; };
  function ajouterPartie(duree, fn, nom, legende) {
    var d = Number(duree);
    if (!(d >= 0.5)) { d = 5; }
    etat.parties.push({ nom: nom ? String(nom) : '', duree: d, legende: legende ? String(legende) : '', fn: fn });
  }
  window.animer = function (duree, fn, options) {
    options = options || {};
    ajouterPartie(duree, fn, options.titre, options.legende);
  };
  window.chapitre = function (nom, duree, legende, fn) {
    if (typeof legende === 'function') { fn = legende; legende = ''; }
    ajouterPartie(duree, fn, nom, legende);
  };
  window.seg = seg;
  window.ease = ease;
  window.lerp = lerp;
  window.mixerChemin = mixerChemin;
  window.C = C;

  function erreur(msg) {
    var b = $('an-erreur');
    b.textContent = T.erreurAnimation + ' : ' + msg;
    b.style.display = 'block';
  }
  function echec(msg) {
    erreur(msg);
    document.body.classList.add('echec');
    $('an-squelette').classList.add('fini');
  }
  window.onerror = function (message, source, ligne) { erreur(message + (ligne ? ' (ligne ' + ligne + ')' : '')); };
  window.addEventListener('unhandledrejection', function (e) { erreur(String(e.reason)); });

  function debutPartie(i) {
    var d = 0;
    for (var k = 0; k < i; k++) { d += etat.parties[k].duree; }
    return d;
  }
  function formater(x) {
    var s = Math.floor(x + 0.001);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  function appliquer(el, a) {
    if (!a) { return; }
    for (var cle in a) {
      if (!Object.prototype.hasOwnProperty.call(a, cle) || cle === 'dans') { continue; }
      var v = a[cle];
      if (cle === 'texte') { el.textContent = v; continue; }
      if (cle === 'points' && Array.isArray(v)) {
        v = v.map(function (p) { return arrondi(p[0]) + ',' + arrondi(p[1]); }).join(' ');
      }
      if (typeof v === 'number') { v = arrondi(v); }
      var nom = CLES_CONSERVEES[cle] ? cle : cle.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); });
      el.setAttribute(nom, v);
    }
  }

  function creer2d(zone) {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + LARGEUR + ' ' + HAUTEUR);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('role', 'img');
    var racine = document.createElementNS(NS, 'g');
    svg.appendChild(racine);
    zone.insertBefore(svg, zone.firstChild);
    var S = { svg: svg, racine: racine, largeur: LARGEUR, hauteur: HAUTEUR };

    function fabriquer(balise, defauts, a) {
      var el = document.createElementNS(NS, balise);
      appliquer(el, defauts);
      appliquer(el, a);
      ((a && a.dans) || racine).appendChild(el);
      el.set = function (b) { appliquer(el, b); return el; };
      el.pose = function (dx, dy, angle, cx, cy, echelle) {
        cx = cx || 0;
        cy = cy || 0;
        if (echelle === undefined) { echelle = 1; }
        el.setAttribute('transform',
          'translate(' + arrondi(dx || 0) + ' ' + arrondi(dy || 0) + ') ' +
          'translate(' + arrondi(cx) + ' ' + arrondi(cy) + ') ' +
          'rotate(' + arrondi(angle || 0) + ') scale(' + arrondi(echelle) + ') ' +
          'translate(' + arrondi(-cx) + ' ' + arrondi(-cy) + ')');
        return el;
      };
      el.trace = function (p) {
        var longueur = el.getTotalLength ? el.getTotalLength() : 0;
        el.style.strokeDasharray = longueur + ' ' + (longueur + 1);
        el.style.strokeDashoffset = String(arrondi(longueur * (1 - borne(p))));
        return el;
      };
      return el;
    }

    function trait() {
      return { stroke: C.texte, 'stroke-width': 2, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
    }
    S.ligne = function (x1, y1, x2, y2, a) {
      return fabriquer('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: C.texte, 'stroke-width': 2, 'stroke-linecap': 'round' }, a);
    };
    S.rect = function (x, y, l, h, a) { return fabriquer('rect', fusion(trait(), { x: x, y: y, width: l, height: h }), a); };
    S.cercle = function (cx, cy, r, a) { return fabriquer('circle', fusion(trait(), { cx: cx, cy: cy, r: r }), a); };
    S.polygone = function (points, a) { return fabriquer('polygon', fusion(trait(), { points: points }), a); };
    S.chemin = function (d, a) { return fabriquer('path', fusion(trait(), { d: d }), a); };
    S.texte = function (x, y, s, a) {
      return fabriquer('text', { x: x, y: y, texte: s, fill: C.texte, stroke: 'none', 'font-size': 22, 'text-anchor': 'start' }, a);
    };
    S.groupe = function (a) { return fabriquer('g', null, a); };
    S.camera = function (cx, cy, zoom) {
      racine.setAttribute('transform',
        'translate(' + (LARGEUR / 2) + ' ' + (HAUTEUR / 2) + ') scale(' + arrondi(zoom || 1) + ') translate(' + arrondi(-cx) + ' ' + arrondi(-cy) + ')');
    };
    return S;
  }

  function creer3d(zone, THREE) {
    var rendu = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendu.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    rendu.domElement.style.cssText = 'display:block;width:100%;height:100%';
    zone.insertBefore(rendu.domElement, zone.firstChild);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, LARGEUR / HAUTEUR, 0.1, 1000);
    camera.position.set(5, 4, 7);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    var soleil = new THREE.DirectionalLight(0xffffff, 0.8);
    soleil.position.set(5, 8, 6);
    scene.add(soleil);
    var S = { THREE: THREE, scene: scene, camera: camera, renderer: rendu, largeur: LARGEUR, hauteur: HAUTEUR };

    function maille(geometrie, couleur, options) {
      var materiau = new THREE.MeshStandardMaterial(fusion({ color: new THREE.Color(couleur || C.accent), roughness: 0.55, metalness: 0.05 }, options));
      var m = new THREE.Mesh(geometrie, materiau);
      scene.add(m);
      return m;
    }
    S.boite = function (l, h, p, couleur, options) { return maille(new THREE.BoxGeometry(l, h, p), couleur, options); };
    S.sphere = function (r, couleur, options) { return maille(new THREE.SphereGeometry(r, 32, 24), couleur, options); };
    S.cylindre = function (r, h, couleur, options) { return maille(new THREE.CylinderGeometry(r, r, h, 32), couleur, options); };
    S.cone = function (r, h, couleur, options) { return maille(new THREE.ConeGeometry(r, h, 32), couleur, options); };
    S.aretes = function (m, couleur) {
      var lignes = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: new THREE.Color(couleur || C.texte) }));
      m.add(lignes);
      return lignes;
    };
    S.ligne3d = function (points, couleur) {
      var vecteurs = points.map(function (q) { return new THREE.Vector3(q[0], q[1], q[2]); });
      var l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(vecteurs), new THREE.LineBasicMaterial({ color: new THREE.Color(couleur || C.texte) }));
      scene.add(l);
      return l;
    };
    S.orbite = function (angleH, angleV, distance, cible) {
      var c = cible || [0, 0, 0];
      var h = angleH * Math.PI / 180;
      var v = angleV * Math.PI / 180;
      camera.position.set(
        c[0] + distance * Math.cos(v) * Math.sin(h),
        c[1] + distance * Math.sin(v),
        c[2] + distance * Math.cos(v) * Math.cos(h));
      camera.lookAt(c[0], c[1], c[2]);
    };
    S.redimensionner = function () {
      var l = zone.clientWidth;
      var h = zone.clientHeight;
      if (!l || !h) { return; }
      rendu.setSize(l, h, false);
      camera.aspect = l / h;
      camera.updateProjectionMatrix();
    };
    S.terminer = function () { rendu.render(scene, camera); };
    return S;
  }

  function instantane2d(racine) {
    var liste = [];
    function visiter(el) {
      var attrs = {};
      for (var i = 0; i < el.attributes.length; i++) { attrs[el.attributes[i].name] = el.attributes[i].value; }
      liste.push({ el: el, attrs: attrs, texte: (el.tagName.toLowerCase() === 'text' && el.children.length === 0) ? el.textContent : null });
      for (var k = 0; k < el.children.length; k++) { visiter(el.children[k]); }
    }
    visiter(racine);
    return function () {
      liste.forEach(function (it) {
        var el = it.el;
        for (var i = el.attributes.length - 1; i >= 0; i--) {
          var nom = el.attributes[i].name;
          if (!(nom in it.attrs)) { el.removeAttribute(nom); }
        }
        for (var n in it.attrs) {
          if (el.getAttribute(n) !== it.attrs[n]) { el.setAttribute(n, it.attrs[n]); }
        }
        if (it.texte !== null && el.textContent !== it.texte) { el.textContent = it.texte; }
      });
    };
  }

  function instantane3d(S) {
    var liste = [];
    S.scene.traverse(function (o) {
      var it = { o: o, pos: o.position.clone(), rot: o.rotation.clone(), ech: o.scale.clone(), vis: o.visible, mat: null };
      if (o.material && !Array.isArray(o.material)) {
        it.mat = o.material;
        it.op = o.material.opacity;
        it.tr = o.material.transparent;
        it.col = o.material.color ? o.material.color.clone() : null;
      }
      liste.push(it);
    });
    var cam = S.camera;
    var camPos = cam.position.clone();
    var camQuat = cam.quaternion.clone();
    var camFov = cam.fov;
    return function () {
      liste.forEach(function (it) {
        it.o.position.copy(it.pos);
        it.o.rotation.copy(it.rot);
        it.o.scale.copy(it.ech);
        it.o.visible = it.vis;
        if (it.mat) {
          it.mat.opacity = it.op;
          it.mat.transparent = it.tr;
          if (it.col) { it.mat.color.copy(it.col); }
        }
      });
      cam.position.copy(camPos);
      cam.quaternion.copy(camQuat);
      if (cam.fov !== camFov) { cam.fov = camFov; cam.updateProjectionMatrix(); }
    };
  }

  function majBoutons() {
    document.body.classList.toggle('joue', etat.joue);
    $('an-jouer').setAttribute('aria-label', etat.joue ? T.pause : T.lecture);
  }

  function majInterface(idx) {
    if (idx !== etat.idx) {
      etat.idx = idx;
      var legende = $('an-legende');
      legende.textContent = etat.parties[idx].legende;
      legende.classList.remove('maj');
      void legende.offsetWidth;
      legende.classList.add('maj');
      var puces = $('an-chap').children;
      for (var k = 0; k < puces.length; k++) { puces[k].classList.toggle('actif', k === idx); }
      if (!etat.parties[idx].legende) { legende.classList.remove('maj'); }
    }
    var part = etat.duree ? etat.t / etat.duree : 0;
    var curseur = $('an-pos');
    curseur.value = Math.round(part * 1000);
    curseur.style.setProperty('--pos', (part * 100) + '%');
    $('an-temps').textContent = formater(etat.t) + ' / ' + formater(etat.duree);
    $('an-voile').classList.toggle('visible', !etat.joue && etat.t === 0);
  }

  function rendre() {
    if (!etat.pret) { return; }
    var debuts = [];
    var cumul = 0;
    var idx = 0;
    for (var i = 0; i < etat.parties.length; i++) {
      debuts.push(cumul);
      if (etat.t >= cumul - 0.000001) { idx = i; }
      cumul += etat.parties[i].duree;
    }
    etat.restaurer();
    for (var k = 0; k <= idx; k++) {
      var ch = etat.parties[k];
      var p = k < idx ? 1 : borne((etat.t - debuts[k]) / ch.duree);
      try {
        ch.fn(p, etat.S);
      } catch (e) {
        erreur(e && e.message ? e.message : String(e));
        etat.joue = false;
        majBoutons();
        return;
      }
    }
    if (etat.S.terminer) { etat.S.terminer(); }
    majInterface(idx);
  }

  function boucle(maintenant) {
    if (!etat.joue) { return; }
    var dt = Math.min(Math.max((maintenant - etat.dernier) / 1000, 0), 0.1);
    etat.dernier = maintenant;
    etat.t += dt;
    if (etat.t >= etat.duree) {
      etat.t = etat.duree;
      etat.joue = false;
      majBoutons();
    }
    rendre();
    if (etat.joue) { requestAnimationFrame(boucle); }
  }
  function jouer() {
    if (!etat.pret || etat.joue) { return; }
    if (etat.t >= etat.duree) { etat.t = 0; }
    etat.joue = true;
    etat.dernier = performance.now();
    majBoutons();
    requestAnimationFrame(boucle);
  }
  function pause() { etat.joue = false; majBoutons(); rendre(); }
  function basculer() { if (etat.joue) { pause(); } else { jouer(); } }

  function construireControles() {
    var chap = $('an-chap');
    chap.setAttribute('aria-label', T.chapitres);
    var titrees = etat.parties.filter(function (q) { return q.nom; }).length;
    var avecLegende = etat.parties.some(function (q) { return q.legende; });
    document.body.classList.toggle('sans-chapitres', titrees < 2);
    document.body.classList.toggle('sans-legende', !avecLegende);
    etat.parties.forEach(function (ch, i) {
      if (!ch.nom) { ch.nom = String(i + 1); }
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = ch.nom === String(i + 1) ? ch.nom : (i + 1) + '. ' + ch.nom;
      b.addEventListener('click', function () {
        etat.t = debutPartie(i);
        rendre();
        jouer();
      });
      chap.appendChild(b);
    });
    $('an-jouer').addEventListener('click', basculer);
    $('an-recom').addEventListener('click', function () { etat.t = 0; rendre(); jouer(); });
    $('an-pos').addEventListener('input', function (e) {
      etat.t = (e.target.value / 1000) * etat.duree;
      rendre();
    });
    $('an-zone').addEventListener('click', basculer);
    document.addEventListener('keydown', function (e) {
      if (e.code !== 'Space' && e.key !== ' ') { return; }
      e.preventDefault();
      if (!e.repeat) { basculer(); }
    });
    document.addEventListener('keyup', function (e) {
      if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); }
    });
  }

  function charger(urls, ok, ko) {
    var i = 0;
    function suivant() {
      if (i >= urls.length) { ko(); return; }
      var fini = false;
      var s = document.createElement('script');
      function passer() {
        if (fini) { return; }
        fini = true;
        s.remove();
        suivant();
      }
      s.onload = function () {
        if (fini) { return; }
        fini = true;
        if (window.THREE) { ok(); } else { suivant(); }
      };
      s.onerror = passer;
      setTimeout(passer, 12000);
      s.src = urls[i++];
      document.head.appendChild(s);
    }
    suivant();
  }

  function sansScene() {
    if ($('an-erreur').style.display !== 'block') { echec(T.aucuneScene); }
    else { document.body.classList.add('echec'); $('an-squelette').classList.add('fini'); }
  }

  function lancer() {
    try {
      if (etat.installeur) { etat.installeur(etat.S); }
    } catch (e) {
      echec(e && e.message ? e.message : String(e));
      return;
    }
    // Le modèle peut appeler animer à l'intérieur de installer : le nombre de parties
    // n'est donc connu qu'après son exécution.
    if (!etat.parties.length) { sansScene(); return; }
    etat.duree = debutPartie(etat.parties.length);
    construireControles();
    etat.restaurer = (etat.mode === '3d') ? instantane3d(etat.S) : instantane2d(etat.S.racine);
    etat.pret = true;
    $('an-squelette').classList.add('fini');
    if (etat.S.redimensionner) {
      etat.S.redimensionner();
      new ResizeObserver(function () { etat.S.redimensionner(); rendre(); }).observe($('an-zone'));
    }
    majBoutons();
    rendre();
    // Reprise après un changement de thème : la page recharge l'animation avec
    // les nouvelles couleurs et lui donne le temps et l'état de lecture où elle
    // en était (voir AnimationLecteur.tsx).
    if (CONF.reprise) {
      etat.t = Math.min(Math.max(Number(CONF.reprise.t) || 0, 0), etat.duree);
      rendre();
      if (CONF.reprise.joue && etat.t < etat.duree) { jouer(); }
    }
  }

  // La page demande où en est l'animation juste avant de la recharger.
  window.addEventListener('message', function (e) {
    if (e.source !== parent || !e.data || e.data.type !== 'dj-anim-demande-etat') { return; }
    parent.postMessage({ type: 'dj-anim-etat', t: etat.t, joue: etat.joue }, '*');
  });

  window.__animDemarrer = function () {
    var zone = $('an-zone');
    if (!etat.parties.length && !etat.installeur) { sansScene(); return; }
    if (etat.mode === '3d') {
      charger(CONF.sourcesTroisD, function () {
        try { etat.S = creer3d(zone, window.THREE); } catch (e) { echec(T.erreurTroisDIndisponible); return; }
        lancer();
      }, function () { echec(T.erreurTroisD); });
    } else {
      etat.S = creer2d(zone);
      lancer();
    }
  };
})();
`;
