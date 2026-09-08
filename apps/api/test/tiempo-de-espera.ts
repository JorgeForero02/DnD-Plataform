// **El tiempo de espera de los e2e de API, declarado y explicado** (ficha P2-10).
//
// Jest trae 5 000 ms por defecto, y ese número está pensado para una prueba unitaria. Estos
// ficheros hacen otra cosa: cada uno levanta una aplicación Nest entera, registra dos o tres
// cuentas **hasheando con argon2** —caro a propósito, es una defensa y no se toca— y habla con un
// Postgres de verdad antes de llegar a su primera aserción.
//
// **Medido el 2026-09-07, en las dos direcciones, y no es lo que la ficha creía.** La suite
// entera, sola en la máquina, pasa: 53 suites, 414 pruebas, verde. La misma suite con las
// unitarias de la web corriendo a la vez —que es lo que pasa en cuanto alguien trabaja mientras
// corre— cae con **23 suites y 204 pruebas rojas**, y la inmensa mayoría por
// `Exceeded timeout of 5000 ms for a hook`: el `beforeAll` que monta la aplicación y registra a la
// mesa. No son «dos pruebas lentas», que es como estaba escrita la ficha: es que el tope por
// defecto no vale para esta capa.
//
// **Lo que NO es el arreglo, y está descartado a propósito:** bajar el paralelismo (esconde el
// problema y alarga la suite entera) y abaratar `argon2` (es la defensa de las contraseñas, no un
// ajuste de rendimiento). Lo que se arregla es el número que estaba mal elegido.
//
// **Por qué 30 s.** La suite más lenta sin contención tarda ~24 s de reloj para el fichero
// completo, y ninguna prueba suelta se acerca a 30 s ni con la máquina cargada. Es holgura para el
// arranque, no permiso para que una prueba se cuelgue: un fichero que de verdad se atasque sigue
// muriendo, solo que con un diagnóstico que no manda a mirar el commit equivocado.
jest.setTimeout(30_000);
