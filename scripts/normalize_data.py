import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"

SOURCE_URLS = {
    "games": "https://worldcup26.ir/get/games",
    "teams": "https://worldcup26.ir/get/teams",
    "groups": "https://worldcup26.ir/get/groups",
    "stadiums": "https://worldcup26.ir/get/stadiums",
}


TEAM_ES = {
    "Mexico": "México",
    "South Africa": "Sudáfrica",
    "South Korea": "Corea del Sur",
    "Czech Republic": "Chequia",
    "Canada": "Canadá",
    "Bosnia and Herzegovina": "Bosnia y Herzegovina",
    "Qatar": "Qatar",
    "Switzerland": "Suiza",
    "Brazil": "Brasil",
    "Morocco": "Marruecos",
    "Haiti": "Haití",
    "Scotland": "Escocia",
    "United States": "Estados Unidos",
    "Paraguay": "Paraguay",
    "Australia": "Australia",
    "Turkey": "Turquía",
    "Germany": "Alemania",
    "Curaçao": "Curazao",
    "Ivory Coast": "Costa de Marfil",
    "Ecuador": "Ecuador",
    "Netherlands": "Países Bajos",
    "Japan": "Japón",
    "Sweden": "Suecia",
    "Tunisia": "Túnez",
    "Belgium": "Bélgica",
    "Egypt": "Egipto",
    "Iran": "Irán",
    "New Zealand": "Nueva Zelanda",
    "Spain": "España",
    "Cape Verde": "Cabo Verde",
    "Saudi Arabia": "Arabia Saudita",
    "Uruguay": "Uruguay",
    "France": "Francia",
    "Senegal": "Senegal",
    "Iraq": "Irak",
    "Norway": "Noruega",
    "Argentina": "Argentina",
    "Algeria": "Argelia",
    "Austria": "Austria",
    "Jordan": "Jordania",
    "Portugal": "Portugal",
    "Democratic Republic of the Congo": "RD Congo",
    "Uzbekistan": "Uzbekistán",
    "Colombia": "Colombia",
    "England": "Inglaterra",
    "Croatia": "Croacia",
    "Ghana": "Ghana",
    "Panama": "Panamá",
}


COUNTRY_ES = {
    "United States": "Estados Unidos",
    "Mexico": "México",
    "Canada": "Canadá",
}


TIMEZONE_BY_STADIUM_ID = {
    "1": "America/Mexico_City",
    "2": "America/Mexico_City",
    "3": "America/Monterrey",
    "4": "America/Chicago",
    "5": "America/Chicago",
    "6": "America/Chicago",
    "7": "America/New_York",
    "8": "America/New_York",
    "9": "America/New_York",
    "10": "America/New_York",
    "11": "America/New_York",
    "12": "America/Toronto",
    "13": "America/Vancouver",
    "14": "America/Los_Angeles",
    "15": "America/Los_Angeles",
    "16": "America/Los_Angeles",
}


SCOUTING = {
    "MEX": {
        "rating": 78,
        "attack": 76,
        "midfield": 77,
        "defense": 75,
        "tempo": 81,
        "experience": 82,
        "style_en": "Host energy, quick wide attacks, and dangerous set pieces.",
        "style_es": "Energia de local, ataques por banda y pelota parada peligrosa.",
        "players": [
            ["Santiago Gimenez", "box finisher", "definidor de area"],
            ["Edson Alvarez", "ball-winning anchor", "ancla recuperadora"],
        ],
    },
    "RSA": {
        "rating": 70,
        "attack": 68,
        "midfield": 70,
        "defense": 72,
        "tempo": 73,
        "experience": 64,
        "style_en": "Compact block, counters, and a keeper who can tilt close games.",
        "style_es": "Bloque compacto, contragolpe y arquero capaz de inclinar partidos cerrados.",
        "players": [
            ["Ronwen Williams", "shot-stopper", "ataja penales"],
            ["Teboho Mokoena", "long-range passer", "pase largo y remate"],
        ],
    },
    "KOR": {
        "rating": 80,
        "attack": 80,
        "midfield": 78,
        "defense": 75,
        "tempo": 86,
        "experience": 78,
        "style_en": "Relentless pace, late runs, and transition pressure.",
        "style_es": "Ritmo alto, llegadas tardias y presion en transicion.",
        "players": [
            ["Son Heung-min", "direct runner", "carrera directa"],
            ["Lee Kang-in", "creative left foot", "zurda creativa"],
        ],
    },
    "CZE": {
        "rating": 77,
        "attack": 75,
        "midfield": 79,
        "defense": 77,
        "tempo": 72,
        "experience": 79,
        "style_en": "Physical midfield, aerial threat, and disciplined spacing.",
        "style_es": "Mediocampo fisico, amenaza aerea y orden tactico.",
        "players": [
            ["Patrik Schick", "penalty-box striker", "nueve de area"],
            ["Tomas Soucek", "aerial midfielder", "volante aereo"],
        ],
    },
    "CAN": {
        "rating": 79,
        "attack": 80,
        "midfield": 76,
        "defense": 74,
        "tempo": 87,
        "experience": 73,
        "style_en": "High speed on the left side and aggressive pressing bursts.",
        "style_es": "Muchisima velocidad por izquierda y rafagas de presion alta.",
        "players": [
            ["Alphonso Davies", "elite acceleration", "aceleracion elite"],
            ["Jonathan David", "movement in the box", "movilidad en el area"],
        ],
    },
    "BIH": {
        "rating": 73,
        "attack": 75,
        "midfield": 74,
        "defense": 70,
        "tempo": 68,
        "experience": 80,
        "style_en": "Experienced spine, patient possession, and target play.",
        "style_es": "Columna con experiencia, posesion paciente y juego de referencia.",
        "players": [
            ["Ermedin Demirovic", "pressing forward", "delantero presionante"],
            ["Edin Dzeko", "target striker", "referencia ofensiva"],
        ],
    },
    "QAT": {
        "rating": 72,
        "attack": 72,
        "midfield": 73,
        "defense": 71,
        "tempo": 70,
        "experience": 78,
        "style_en": "Compact rotations, quick combinations, and tournament experience.",
        "style_es": "Rotaciones compactas, asociaciones rapidas y experiencia de torneo.",
        "players": [
            ["Akram Afif", "chance creator", "creador de ocasiones"],
            ["Almoez Ali", "penalty-area timing", "timing de area"],
        ],
    },
    "SUI": {
        "rating": 83,
        "attack": 80,
        "midfield": 84,
        "defense": 83,
        "tempo": 76,
        "experience": 87,
        "style_en": "Tournament-hardened structure with calm midfield control.",
        "style_es": "Estructura curtida en torneos y control sereno del mediocampo.",
        "players": [
            ["Granit Xhaka", "tempo controller", "control de ritmo"],
            ["Manuel Akanji", "line leader", "lider de linea"],
        ],
    },
    "BRA": {
        "rating": 91,
        "attack": 93,
        "midfield": 88,
        "defense": 86,
        "tempo": 88,
        "experience": 88,
        "style_en": "Elite one-v-one attack, flexible creators, and pressure after loss.",
        "style_es": "Uno contra uno elite, creadores flexibles y presion tras perdida.",
        "players": [
            ["Vinicius Junior", "isolation dribbler", "regate en aislamiento"],
            ["Rodrygo", "inside creator", "creador interior"],
        ],
    },
    "MAR": {
        "rating": 84,
        "attack": 81,
        "midfield": 83,
        "defense": 86,
        "tempo": 82,
        "experience": 82,
        "style_en": "Defensive confidence, fast full-backs, and efficient counters.",
        "style_es": "Confianza defensiva, laterales rapidos y contragolpe eficiente.",
        "players": [
            ["Achraf Hakimi", "two-way full-back", "lateral ida y vuelta"],
            ["Sofyan Amrabat", "duel anchor", "ancla de duelos"],
        ],
    },
    "HAI": {
        "rating": 66,
        "attack": 67,
        "midfield": 65,
        "defense": 64,
        "tempo": 76,
        "experience": 58,
        "style_en": "Direct play, emotional momentum, and underdog volatility.",
        "style_es": "Juego directo, impulso emocional y volatilidad de tapado.",
        "players": [
            ["Duckens Nazon", "direct finisher", "definidor directo"],
            ["Frantzdy Pierrot", "aerial outlet", "salida aerea"],
        ],
    },
    "SCO": {
        "rating": 78,
        "attack": 76,
        "midfield": 80,
        "defense": 77,
        "tempo": 77,
        "experience": 80,
        "style_en": "Combative midfield, overlapping width, and set-piece edge.",
        "style_es": "Mediocampo combativo, amplitud por fuera y ventaja en pelota parada.",
        "players": [
            ["Scott McTominay", "late box runs", "llegadas al area"],
            ["Andy Robertson", "left-side engine", "motor por izquierda"],
        ],
    },
    "USA": {
        "rating": 82,
        "attack": 82,
        "midfield": 81,
        "defense": 78,
        "tempo": 85,
        "experience": 76,
        "style_en": "Host lift, vertical pressing, and quick attacking transitions.",
        "style_es": "Impulso de local, presion vertical y transiciones rapidas.",
        "players": [
            ["Christian Pulisic", "final-third spark", "chispa en ataque"],
            ["Tyler Adams", "pressing balance", "equilibrio de presion"],
        ],
    },
    "PAR": {
        "rating": 76,
        "attack": 75,
        "midfield": 75,
        "defense": 79,
        "tempo": 73,
        "experience": 74,
        "style_en": "Stubborn defending, counter threat, and high duel appetite.",
        "style_es": "Defensa incomoda, amenaza de contra y mucho duelo.",
        "players": [
            ["Miguel Almiron", "counter runner", "corredor de contra"],
            ["Julio Enciso", "shot creator", "creador de remate"],
        ],
    },
    "AUS": {
        "rating": 75,
        "attack": 72,
        "midfield": 74,
        "defense": 77,
        "tempo": 74,
        "experience": 80,
        "style_en": "Tournament grit, aerial battles, and disciplined blocks.",
        "style_es": "Competitividad de torneo, duelos aereos y bloques disciplinados.",
        "players": [
            ["Mat Ryan", "organizing keeper", "arquero organizador"],
            ["Jackson Irvine", "duel midfielder", "volante de duelos"],
        ],
    },
    "TUR": {
        "rating": 80,
        "attack": 81,
        "midfield": 80,
        "defense": 74,
        "tempo": 82,
        "experience": 76,
        "style_en": "Creative midfield, long-shot threat, and emotional swings.",
        "style_es": "Mediocampo creativo, amenaza de media distancia y cambios emocionales.",
        "players": [
            ["Hakan Calhanoglu", "deep conductor", "director retrasado"],
            ["Arda Guler", "creative spark", "chispa creativa"],
        ],
    },
    "GER": {
        "rating": 88,
        "attack": 89,
        "midfield": 90,
        "defense": 82,
        "tempo": 85,
        "experience": 86,
        "style_en": "Technical overloads, fast combinations, and ruthless finishing runs.",
        "style_es": "Superioridades tecnicas, asociaciones rapidas y llegadas agresivas.",
        "players": [
            ["Jamal Musiala", "tight-space dribbler", "regate en espacios cortos"],
            ["Florian Wirtz", "between-lines creator", "creador entre lineas"],
        ],
    },
    "CUW": {
        "rating": 64,
        "attack": 65,
        "midfield": 64,
        "defense": 62,
        "tempo": 69,
        "experience": 57,
        "style_en": "Historic debut energy with risk-taking in open phases.",
        "style_es": "Energia de debut historico y riesgo en fases abiertas.",
        "players": [
            ["Juninho Bacuna", "line-breaking passer", "pase rompe lineas"],
            ["Leandro Bacuna", "set-piece delivery", "centros a balon parado"],
        ],
    },
    "CIV": {
        "rating": 81,
        "attack": 82,
        "midfield": 82,
        "defense": 78,
        "tempo": 80,
        "experience": 82,
        "style_en": "Powerful duels, wide pace, and strong second-ball pressure.",
        "style_es": "Duelos potentes, velocidad por fuera y presion en segunda pelota.",
        "players": [
            ["Franck Kessie", "box-to-box power", "potencia ida y vuelta"],
            ["Simon Adingra", "wide acceleration", "aceleracion por banda"],
        ],
    },
    "ECU": {
        "rating": 82,
        "attack": 78,
        "midfield": 85,
        "defense": 83,
        "tempo": 80,
        "experience": 77,
        "style_en": "Young physical core, strong ball-winning, and clean buildup.",
        "style_es": "Nucleo joven y fisico, recuperacion fuerte y salida limpia.",
        "players": [
            ["Moises Caicedo", "duel magnet", "iman de duelos"],
            ["Piero Hincapie", "left-footed defender", "defensor zurdo"],
        ],
    },
    "NED": {
        "rating": 87,
        "attack": 86,
        "midfield": 85,
        "defense": 88,
        "tempo": 81,
        "experience": 86,
        "style_en": "Back-line authority, creators between lines, and controlled tempo.",
        "style_es": "Autoridad defensiva, creadores entre lineas y ritmo controlado.",
        "players": [
            ["Virgil van Dijk", "aerial leader", "lider aereo"],
            ["Xavi Simons", "half-space creator", "creador en pasillo interior"],
        ],
    },
    "JPN": {
        "rating": 84,
        "attack": 84,
        "midfield": 84,
        "defense": 80,
        "tempo": 89,
        "experience": 80,
        "style_en": "Fast rotations, disciplined pressing, and technical wide threats.",
        "style_es": "Rotaciones veloces, presion disciplinada y amenaza tecnica por banda.",
        "players": [
            ["Takefusa Kubo", "left-foot creator", "zurda creativa"],
            ["Kaoru Mitoma", "wing isolation", "uno contra uno por banda"],
        ],
    },
    "SWE": {
        "rating": 79,
        "attack": 82,
        "midfield": 78,
        "defense": 76,
        "tempo": 77,
        "experience": 75,
        "style_en": "Direct attacking talent, aerial edge, and transition finishing.",
        "style_es": "Talento ofensivo directo, ventaja aerea y definicion en transicion.",
        "players": [
            ["Alexander Isak", "smooth finisher", "definidor fino"],
            ["Dejan Kulusevski", "carry creator", "creador conduciendo"],
        ],
    },
    "TUN": {
        "rating": 74,
        "attack": 70,
        "midfield": 75,
        "defense": 77,
        "tempo": 72,
        "experience": 77,
        "style_en": "Tight defensive distances, midfield grit, and set-piece patience.",
        "style_es": "Distancias defensivas cortas, garra media y paciencia en pelota parada.",
        "players": [
            ["Ellyes Skhiri", "screening midfielder", "volante de cobertura"],
            ["Hannibal Mejbri", "pressing spark", "chispa de presion"],
        ],
    },
    "BEL": {
        "rating": 85,
        "attack": 87,
        "midfield": 85,
        "defense": 78,
        "tempo": 82,
        "experience": 86,
        "style_en": "Creative veterans, explosive wings, and possession control.",
        "style_es": "Veteranos creativos, bandas explosivas y control de posesion.",
        "players": [
            ["Kevin De Bruyne", "chance engine", "motor creativo"],
            ["Jeremy Doku", "dribble chaos", "caos en el regate"],
        ],
    },
    "EGY": {
        "rating": 78,
        "attack": 82,
        "midfield": 76,
        "defense": 73,
        "tempo": 76,
        "experience": 80,
        "style_en": "Star-led attack, direct diagonals, and dangerous counters.",
        "style_es": "Ataque liderado por figuras, diagonales directas y contras peligrosas.",
        "players": [
            ["Mohamed Salah", "elite final ball", "ultimo pase elite"],
            ["Omar Marmoush", "transition runner", "corredor de transicion"],
        ],
    },
    "IRN": {
        "rating": 79,
        "attack": 80,
        "midfield": 77,
        "defense": 76,
        "tempo": 74,
        "experience": 83,
        "style_en": "Experienced forwards, compact defense, and clinical counters.",
        "style_es": "Delanteros experimentados, defensa compacta y contras clinicas.",
        "players": [
            ["Mehdi Taremi", "penalty-box craft", "oficio de area"],
            ["Sardar Azmoun", "vertical striker", "delantero vertical"],
        ],
    },
    "NZL": {
        "rating": 68,
        "attack": 69,
        "midfield": 66,
        "defense": 67,
        "tempo": 69,
        "experience": 70,
        "style_en": "Aerial outlet, compact shape, and low-risk buildup.",
        "style_es": "Referencia aerea, bloque compacto y salida de bajo riesgo.",
        "players": [
            ["Chris Wood", "aerial finisher", "definidor aereo"],
            ["Liberato Cacace", "left-side runner", "corredor por izquierda"],
        ],
    },
    "ESP": {
        "rating": 90,
        "attack": 89,
        "midfield": 93,
        "defense": 86,
        "tempo": 88,
        "experience": 84,
        "style_en": "Possession pressure, elite technicians, and patience around the box.",
        "style_es": "Presion con posesion, tecnicos elite y paciencia cerca del area.",
        "players": [
            ["Lamine Yamal", "wide creator", "creador por banda"],
            ["Pedri", "tempo manipulator", "manipulador de ritmo"],
        ],
    },
    "CPV": {
        "rating": 71,
        "attack": 70,
        "midfield": 71,
        "defense": 72,
        "tempo": 73,
        "experience": 65,
        "style_en": "First World Cup edge, resilient blocks, and quick wide counters.",
        "style_es": "Impulso de primer Mundial, bloques resistentes y contras por banda.",
        "players": [
            ["Ryan Mendes", "veteran winger", "extremo veterano"],
            ["Logan Costa", "aerial defender", "central aereo"],
        ],
    },
    "KSA": {
        "rating": 73,
        "attack": 72,
        "midfield": 74,
        "defense": 72,
        "tempo": 76,
        "experience": 78,
        "style_en": "High emotional ceiling, quick combinations, and tournament belief.",
        "style_es": "Techo emocional alto, asociaciones rapidas y fe de torneo.",
        "players": [
            ["Salem Al-Dawsari", "big-moment winger", "extremo de momentos grandes"],
            ["Saleh Al-Shehri", "penalty-area poacher", "cazador de area"],
        ],
    },
    "URU": {
        "rating": 86,
        "attack": 86,
        "midfield": 88,
        "defense": 83,
        "tempo": 84,
        "experience": 86,
        "style_en": "Aggressive pressing, elite midfield legs, and direct finishing.",
        "style_es": "Presion agresiva, piernas elite en el medio y definicion directa.",
        "players": [
            ["Federico Valverde", "range and power", "rango y potencia"],
            ["Darwin Nunez", "vertical threat", "amenaza vertical"],
        ],
    },
    "FRA": {
        "rating": 92,
        "attack": 94,
        "midfield": 89,
        "defense": 88,
        "tempo": 90,
        "experience": 90,
        "style_en": "Explosive transitions, deep squad quality, and knockout pedigree.",
        "style_es": "Transiciones explosivas, plantel profundo y pedigree de eliminatorias.",
        "players": [
            ["Kylian Mbappe", "open-field speed", "velocidad a campo abierto"],
            ["Antoine Griezmann", "connector", "conector"],
        ],
    },
    "SEN": {
        "rating": 82,
        "attack": 82,
        "midfield": 80,
        "defense": 81,
        "tempo": 81,
        "experience": 83,
        "style_en": "Physical balance, direct runners, and mature tournament rhythm.",
        "style_es": "Equilibrio fisico, corredores directos y ritmo maduro de torneo.",
        "players": [
            ["Sadio Mane", "inside winger", "extremo interior"],
            ["Nicolas Jackson", "pressing striker", "delantero presionante"],
        ],
    },
    "IRQ": {
        "rating": 69,
        "attack": 70,
        "midfield": 69,
        "defense": 68,
        "tempo": 72,
        "experience": 62,
        "style_en": "High-variance attack, emotional momentum, and quick releases.",
        "style_es": "Ataque de alta varianza, impulso emocional y salidas rapidas.",
        "players": [
            ["Aymen Hussein", "aerial striker", "delantero aereo"],
            ["Ali Jasim", "direct dribbler", "regate directo"],
        ],
    },
    "NOR": {
        "rating": 83,
        "attack": 88,
        "midfield": 84,
        "defense": 76,
        "tempo": 80,
        "experience": 72,
        "style_en": "Star striker gravity, clean chance creation, and vertical attacks.",
        "style_es": "Gravedad del nueve estrella, creacion limpia y ataque vertical.",
        "players": [
            ["Erling Haaland", "box dominance", "dominio de area"],
            ["Martin Odegaard", "chance architect", "arquitecto de ocasiones"],
        ],
    },
    "ARG": {
        "rating": 93,
        "attack": 91,
        "midfield": 92,
        "defense": 90,
        "tempo": 84,
        "experience": 95,
        "style_en": "Champion composure, technical control, and ruthless late-game detail.",
        "style_es": "Compostura de campeon, control tecnico y detalle letal al cierre.",
        "players": [
            ["Lionel Messi", "final-third genius", "genio en ultimo tercio"],
            ["Julian Alvarez", "pressing finisher", "definidor presionante"],
        ],
    },
    "ALG": {
        "rating": 77,
        "attack": 79,
        "midfield": 77,
        "defense": 73,
        "tempo": 75,
        "experience": 81,
        "style_en": "Creative wide play, technical midfield, and counter rhythm.",
        "style_es": "Juego creativo por banda, mediocampo tecnico y ritmo de contra.",
        "players": [
            ["Riyad Mahrez", "wide creator", "creador por banda"],
            ["Ismael Bennacer", "press resistance", "resistencia a presion"],
        ],
    },
    "AUT": {
        "rating": 81,
        "attack": 79,
        "midfield": 83,
        "defense": 80,
        "tempo": 82,
        "experience": 80,
        "style_en": "Well-drilled pressing, smart spacing, and dead-ball quality.",
        "style_es": "Presion trabajada, espacios inteligentes y calidad en balon parado.",
        "players": [
            ["David Alaba", "defensive organizer", "organizador defensivo"],
            ["Marcel Sabitzer", "two-way midfielder", "volante mixto"],
        ],
    },
    "JOR": {
        "rating": 67,
        "attack": 68,
        "midfield": 66,
        "defense": 66,
        "tempo": 71,
        "experience": 60,
        "style_en": "Underdog energy, direct outlets, and disciplined low blocks.",
        "style_es": "Energia de tapado, salidas directas y bloque bajo disciplinado.",
        "players": [
            ["Mousa Al-Taamari", "solo runner", "conductor individual"],
            ["Yazan Al-Naimat", "transition finisher", "definidor de transicion"],
        ],
    },
    "POR": {
        "rating": 89,
        "attack": 91,
        "midfield": 90,
        "defense": 85,
        "tempo": 84,
        "experience": 88,
        "style_en": "Deep attacking options, creators everywhere, and set-piece bite.",
        "style_es": "Muchas opciones de ataque, creadores por todos lados y pelota parada fuerte.",
        "players": [
            ["Bruno Fernandes", "chance volume", "volumen creativo"],
            ["Bernardo Silva", "control in traffic", "control entre marcas"],
        ],
    },
    "COD": {
        "rating": 73,
        "attack": 74,
        "midfield": 72,
        "defense": 74,
        "tempo": 76,
        "experience": 70,
        "style_en": "Powerful transition runners, physical duels, and direct pressure.",
        "style_es": "Corredores potentes en transicion, duelos fisicos y presion directa.",
        "players": [
            ["Chancel Mbemba", "defensive leader", "lider defensivo"],
            ["Yoane Wissa", "channel runner", "atacante de canales"],
        ],
    },
    "UZB": {
        "rating": 72,
        "attack": 71,
        "midfield": 73,
        "defense": 72,
        "tempo": 74,
        "experience": 61,
        "style_en": "Historic debut, disciplined buildup, and sharp attacking pockets.",
        "style_es": "Debut historico, salida disciplinada y ataques en bolsillos interiores.",
        "players": [
            ["Eldor Shomurodov", "reference striker", "delantero referencia"],
            ["Abbosbek Fayzullaev", "young creator", "joven creador"],
        ],
    },
    "COL": {
        "rating": 84,
        "attack": 85,
        "midfield": 83,
        "defense": 80,
        "tempo": 82,
        "experience": 83,
        "style_en": "Wide flair, midfield bite, and dangerous late surges.",
        "style_es": "Talento por banda, mordida en el medio y empujes finales peligrosos.",
        "players": [
            ["Luis Diaz", "left-wing threat", "amenaza por izquierda"],
            ["James Rodriguez", "final pass", "ultimo pase"],
        ],
    },
    "ENG": {
        "rating": 90,
        "attack": 91,
        "midfield": 89,
        "defense": 85,
        "tempo": 84,
        "experience": 87,
        "style_en": "Elite creators, box presence, and controlled tournament pacing.",
        "style_es": "Creadores elite, presencia de area y ritmo de torneo controlado.",
        "players": [
            ["Jude Bellingham", "box-to-box star", "estrella ida y vuelta"],
            ["Harry Kane", "complete striker", "delantero completo"],
        ],
    },
    "CRO": {
        "rating": 83,
        "attack": 80,
        "midfield": 86,
        "defense": 81,
        "tempo": 76,
        "experience": 91,
        "style_en": "Tournament composure, midfield rhythm, and knockout patience.",
        "style_es": "Compostura de torneo, ritmo de mediocampo y paciencia de eliminatoria.",
        "players": [
            ["Luka Modric", "tempo master", "maestro del ritmo"],
            ["Josko Gvardiol", "progressive defender", "defensor progresivo"],
        ],
    },
    "GHA": {
        "rating": 75,
        "attack": 77,
        "midfield": 75,
        "defense": 71,
        "tempo": 78,
        "experience": 74,
        "style_en": "Unpredictable attack, physical midfield, and counter punch.",
        "style_es": "Ataque impredecible, mediocampo fisico y golpe de contra.",
        "players": [
            ["Mohammed Kudus", "carry threat", "amenaza conduciendo"],
            ["Thomas Partey", "midfield range", "rango en el medio"],
        ],
    },
    "PAN": {
        "rating": 70,
        "attack": 68,
        "midfield": 70,
        "defense": 71,
        "tempo": 73,
        "experience": 72,
        "style_en": "Concacaf grit, compact defending, and second-ball aggression.",
        "style_es": "Garra Concacaf, defensa compacta y agresividad en segunda pelota.",
        "players": [
            ["Adalberto Carrasquilla", "midfield connector", "conector del medio"],
            ["Jose Fajardo", "penalty-box worker", "trabajador de area"],
        ],
    },
}


def load_json(name: str, key: str):
    path = ROOT / f"{name}.tmp.json"
    if path.exists():
        raw = path.read_bytes()
    else:
        with urlopen(SOURCE_URLS[name], timeout=30) as response:
            raw = response.read()
    for encoding in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            return json.loads(raw.decode(encoding))[key]
        except (UnicodeDecodeError, json.JSONDecodeError):
            continue
    raise ValueError(f"Could not decode {name}")


def parse_local_to_utc(local_date: str, stadium_id: str) -> str:
    local = datetime.strptime(local_date, "%m/%d/%Y %H:%M")
    tz = ZoneInfo(TIMEZONE_BY_STADIUM_ID[stadium_id])
    return local.replace(tzinfo=tz).astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def compact_team(team):
    code = team["fifa_code"]
    scouting = SCOUTING[code]
    return {
        "id": team["id"],
        "fifaCode": code,
        "iso2": team["iso2"].lower(),
        "group": team["groups"],
        "name": {"en": team["name_en"], "es": TEAM_ES[team["name_en"]]},
        "flag": team["flag"].replace("/w80/", "/w160/"),
        "scouting": scouting,
    }


def compact_stadium(stadium):
    stadium_id = stadium["id"]
    return {
        "id": stadium_id,
        "name": stadium["name_en"],
        "fifaName": stadium["fifa_name"],
        "city": stadium["city_en"],
        "country": {
            "en": stadium["country_en"],
            "es": COUNTRY_ES.get(stadium["country_en"], stadium["country_en"]),
        },
        "capacity": int(stadium["capacity"]),
        "region": stadium["region"],
        "timeZone": TIMEZONE_BY_STADIUM_ID[stadium_id],
    }


def compact_game(game):
    home_id = game.get("home_team_id", "0")
    away_id = game.get("away_team_id", "0")
    return {
        "id": int(game["id"]),
        "type": game["type"],
        "group": game["group"],
        "matchday": int(game["matchday"]),
        "stadiumId": game["stadium_id"],
        "localDate": game["local_date"],
        "kickoffUtc": parse_local_to_utc(game["local_date"], game["stadium_id"]),
        "homeTeamId": home_id if home_id != "0" else None,
        "awayTeamId": away_id if away_id != "0" else None,
        "homeLabel": game.get("home_team_label"),
        "awayLabel": game.get("away_team_label"),
        "homeScore": int(game["home_score"]),
        "awayScore": int(game["away_score"]),
        "status": "finished" if game.get("finished") == "TRUE" else game.get("time_elapsed", "notstarted"),
    }


def compact_group(group):
    return {
        "name": group["name"],
        "teams": [
            {
                "teamId": row["team_id"],
                "played": int(row["mp"]),
                "wins": int(row["w"]),
                "draws": int(row["d"]),
                "losses": int(row["l"]),
                "points": int(row["pts"]),
                "gf": int(row["gf"]),
                "ga": int(row["ga"]),
                "gd": int(row["gd"]),
            }
            for row in group["teams"]
        ],
    }


def main():
    games = load_json("games", "games")
    teams = load_json("teams", "teams")
    groups = load_json("groups", "groups")
    stadiums = load_json("stadiums", "stadiums")

    dataset = {
        "meta": {
            "name": "Kiniela Mundial 2026",
            "lastGenerated": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "sources": [
                {
                    "label": "FIFA official match schedule",
                    "url": "https://www.fifa.com/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums",
                },
                {
                    "label": "worldcup26.ir public API",
                    "url": "https://worldcup26.ir/",
                },
                {
                    "label": "worldcup26 open-source repository",
                    "url": "https://github.com/rezarahiminia/worldcup2026",
                },
            ],
            "scoreRules": {
                "exact": 7,
                "resultAndOneGoal": 4,
                "result": 3,
                "oneGoal": 1,
            },
        },
        "teams": sorted([compact_team(team) for team in teams], key=lambda t: int(t["id"])),
        "stadiums": sorted([compact_stadium(stadium) for stadium in stadiums], key=lambda s: int(s["id"])),
        "groups": sorted([compact_group(group) for group in groups], key=lambda g: g["name"]),
        "matches": sorted([compact_game(game) for game in games], key=lambda m: m["id"]),
    }

    DATA_DIR.mkdir(exist_ok=True)
    output = DATA_DIR / "worldcup-2026.json"
    output.write_text(json.dumps(dataset, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {output} with {len(dataset['matches'])} matches and {len(dataset['teams'])} teams")


if __name__ == "__main__":
    main()
