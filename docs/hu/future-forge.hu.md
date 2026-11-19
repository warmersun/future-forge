# Future Forge

A Future Forge egy **feltalálási gyakorlat**. Veszel egy globális problémát, egy konkrét helyre ülteted, olyan emberekkel, akik a kárt élik, és **útvonalat** találsz fel feltörekvő technológiákkal egy hatszögletű táblán. Egy SI-társfeltaláló taníthat, vázolhat, és újraértékelheti a lámpákat. Te irányítasz. A feltalálás kapuja soha nem az, hogy „a modell helyetted talál fel.”

Ez a kézikönyv a teljes termék térképe: mire való, milyen eszmék kormányozzák ma is, mit csinál egy menet, milyen funkciók részei a terméknek, hogyan futtatható, és mely ügynökkészségek írják a tartalmát. A mélyebb specifikációk a saját fájljaikban maradnak. A küldetést leíró esszé a [what-is-future-forge.md](what-is-future-forge.md). A telepítési és környezeti táblázatok a [README](../README.md)-ben vannak.

A tanulóknak szóló szöveg gyakorlatnak, menetnek, Questnek és Friendsnek hívja ezt. A Future Forge-ot nem nevezik játéknak.

Az üzemeltetés módjai:

- [Saját üzemeltetés](#self-hosting) — `npm start` a saját gépeden vagy egy általad működtetett szerveren
- [Órák](#classes) — egy közös Quest-mappa és egy szoba, akkor is, amikor egy iskola ezzel tanít
- [Tanulási Questek](#learning-quests) — tutor, leckeoldalak, modulhaladás
- [Szponzorált Questek](#sponsored-quests) — egy megnevezett partner, a feltalálás továbbra is kell
- [Többszereplős menetek](#multi-user-sessions) — Friends szobák és hotseat
- [Ügynökkészségek](#agent-skills) — az az öt MIT-csomag, amely Questeket, előrejelzéseket, kísérő Questeket, trendeket és gyűjtőkártyákat ír

---

## Mi ez

Az emberek már hallanak a technológiáról. A hallás nem a készség. A készség az, hogy összekötsz egy képességet, amely most vált lehetővé, egy emberi problémával, és megmondod: hogyan, itt, ebben az évben.

A Warmer Sun ezt a kapcsolatot **a hiányzó tantárgynak** tekinti: a feltörekvő technológia exponenciális haladása minden más területet átalakít, és ritkán jelenik meg általános műveltségként. A Future Forge az a hely, ahol ez a tantárgy gyakorlattá válik — széles és fiatal közönségnek, korábban, mint egy álláskereső tölcsér. Oldal: [warmersun.com](https://warmersun.com).

A működő definíció:

> **A technológia az, ami valami korábban szűköset vesz, és kitalálja, hogyan tegye bőségessé.**

A hő, a fény, a ruha és a beszéd számít. A telefonok és az SI egy nagyobb térkép tagjai, nem maga a térkép.

Egy menet konkretizál egy globális problémát: egy hely, fiktív emberek, válságnyomás és egy naptár. Nekik találsz fel. Ha túl sokáig vársz, a hely elbukhat.

---

## Tanulási célok

A cél néhány gondolkodási szokás, nem bizonyítvány egyetlen eszközről. Az esszé ezeket teljes egészében kimondja; ez a rövid lista.

1. **Tudni, mi a technológia.** A hétköznapi élet máris tech. A „technológia” a szűkösség oldásának mestersége, nem szinonimája az év címlapeszközének.
2. **Összekötni a haladást a globális problémákkal.** Egy képességbeli előrelépéstől egy nagy kihívásig — klíma, egészség, energia, szegénység, jogok, hosszú távú kockázat — majd egy útvonalig, amely erősödhet, ahogy ezek a technológiák javulnak.
3. **Tartani a tág térképet.** Az SI egy család. A gyakorlat tizenegy családot tart láthatóan, hogy a tanulók kombinálják őket. Az alábbi tálca a választható kártyákat hat tartományba csoportosítja.
4. **Tudni, mit jelent a feltörekvő.** Az érett eszközök gyakran lassan javulnak, vagy egy fennsíkon stagnálnak. A feltörekvő technológiák még meredek görbén haladnak: a jobb eszközök jobb eszközöket szülnek. Egyes területek lassúnak tűnnek, amíg egy konvergencia fel nem oldja őket.
5. **Elkapni a görbét.** A túl korai pára: az eszközök még nem bírják a munkát. A túl késői azt jelenti, hogy a hely már elbukott. Az időzítés része a feltalálásnak.
6. **Gyakorolni a konvergenciát.** A nehéz problémák átnyúlnak a családokon. A polihisztorság itt engedély és készség területeket kombinálni, amikor a helynek erre van szüksége.
7. **Útvonalakat feltalálni.** Egy megoldás úgy hangzik, mintha a mai eszközökön már kész volna. Egy útvonal feltörekvő techhel való építés úgy, hogy ahogy ezek az összetevők javulnak, az egész megközelítés jobbá válik. A skála hosszú íve része az ötletnek.
8. **Az ötleteket mesterségként kezelni, és önkéntesnek tartani.** Egy mechanizmus, egy haszonélvező, egy időzítési állítás és egy kompromisszum megnevezése a munka. Az ötletelés valódi kezdés; nem kiszállított rendszer, és nem kell hozzá labor. Nincs kötelező vizsga, ezért a gyakorlatnak olyannak kell lennie, amelyet az emberek maguk választanak folytatni. Az etika a feltalálással együtt van a szobában (a négy kihívó), nem utána.

Ray Kurzweil előszava a *Danielle: Chronicles of a Superheroine* című könyvhöz az alatta lévő hit: a szorult helyzetekre, amelyekkel szembenézünk, létezik egy ötlet, amely győzelemre visz, és amikor megtaláljuk, végre is hajtjuk. A Future Forge annak a gyakorlata, hogy ezt az ötletet időnyomás alatt, a térképet szem előtt tartva megtaláljuk.

---

## Eszmék, amelyek ma is kormányozzák a tervet

### Származás: a 6Ps asztali forma

A Future Forge 2021-ben asztali formaként indult, **6Ps – Pun Intended** (© 2021 Tamas Simon / Warmer Sun Education). Történeti jegyzetek: [6Ps Game - Pun Intended - Hex emTech.pdf](./6Ps%20Game%20-%20Pun%20Intended%20-%20Hex%20emTech.pdf).

| P | Jelentés |
|---|---------|
| **Progress** | Ami ma történik a tudományban és a technológiában |
| **Prediction** | Mérföldkövek, amelyeket jövőbeli idővonalakra becsülünk |
| **Problem** | Valami, ami most van jelen, és amellyel foglalkozni kell |
| **Prevention** | Egy jövőbeli kár, amelyre még van időnk felkészülni |
| **Pathway** | Amit az emberek feltalálnak — egy építés, amely az exponenciális javuláson utazhat |
| **Pun** | Bólintás Diamandis exponenciálisok 6D-jére: digitized, deceptive, disruptive, demonetized, dematerialized, democratized |

Az asztal feladata megegyezik a mai gyakorlattal: összekötni a feltörekvő techet a globális problémákkal, útvonalakat feltalálni, és osztozni a téten — ha a válság kezeletlen marad, mindenki veszít. A hatást Impact Dollars-ban számolták, abból a gondolatból, hogy egymillió dollárt úgy keresel, ha egymillió emberre hatással vagy.

Túl korai volt. Az ötletek helyesek voltak. A blokkolók valóságosak.

### Az ellentmondás

Ha a tervezés kész lépéseket ad az emberek kezébe, nem találnak fel. Egy tervező, aki kártyáról kártyára megírja, milyen lesz a világ, hazugságot ír, és elveszi a tanuló munkáját.

Ha az emberek valóban ötletelnek, másik probléma jelenik meg: ki dönti el, hogy egy ötlet megvalósítható-e? A korai szavazás a népszerűséget igazságként kezelte. A taps nem a görbe elkapása. És kategóriák, trendek és előrejelzések térképe nélkül a feltalálás találgatásba vagy csendbe omlott.

A **Progress and Predictions** kurzus ([101.warmersun.com](https://101.warmersun.com)) először a térképet próbálta megtanítani, és az asztalt jutalomként kínálta. Egy nem kötelező tantárgynál ez a tölcsér fal. Az emberek nem fejeznek be egy exponenciálisok-prekalkulust, mielőtt feltalálhatnának.

### Amit az SI lehetővé tett

Az SI eltávolította a blokkolókat. Nem a tanuló helyett talál fel.

| Blokkoló | Ami megváltozott |
|----------|------------------|
| Az emberek nem tudnak elég feltörekvő techet | Tanulás menet közben: ismertetők, a társfeltaláló, tutor-modulok |
| Nehéz segítséget kapni a feltalálás közepén | Egy partner, amely javasol; te továbbra is irányítasz |
| Ki ítéli meg a megvalósíthatóságot? | A megvalósíthatóság és az időzítés a képességhez, a helyhez és az előrejelzésbankhoz mérhető |
| Először kurzus, aztán gyakorlat | Feltalálni és tanulni ugyanabban a menetben |

Egyetlen rendszer sem mondhatja azt, hogy ismeri a jövőt. Amit lehet kérdezni, az az, hogy egy állítás őszinte-e a mai képességhez, és hogy az útvonal úgy van-e építve, hogy az egész jobbá válhasson, ahogy a feltörekvő tech javul.

### Először a probléma

A kezdő számára a túlterhelés a hosszú katalógus, és az, hogy nem tudja, egy ötlet hogyan kapcsolódik *ehhez* a problémához. Mindenkinek egy Workshopja van. A feltárás helyben zárul, Questenként, és egy koppintásra újra kinyílik. Nincs kezdő mód, és nincs előfeltétel-kurzus.

A hurok, amelyre a képernyő épül:

> **fájdalom → szükség → család → ötlet → csempe**

A tábla piros hexei a probléma. A tálca arra felel: „mi segíthetne itt.” A **For this place** a Quest Spotlightjával és a javasolt technológiákkal indít, mindegyiknél egy soros indokkal. A teljes katalógus egy koppintásra van. Egy piros válsághex akár három családra és egy **Invent with** műveletre mutathat. Az Ask for ideas látja az élő mérőket. A how-it-works a technológia definíciójából indul: mi a szűkös itt, és hogyan teszi ezt a család bőségesebbé?

Részletek: [problem-first-invent.md](problem-first-invent.md).

### Három nézőpont

Hacsak egy Quest ki nem kapcsolja a mérőket, a feltalálást három szögből ítélik meg:

| Nézőpont | Mérő szerepe | Amit gyakorolsz |
|----------|--------------|-----------------|
| **Itt és most** | `local` | Segít a terepen — a kár, amelyet az emberek ma éreznek? |
| **Gyökérok** | `global` | Mozdít a mögöttes problémán, nemcsak a felszínen? |
| **Támogatás** | `support` | Ki tudsz érdemelni jóakaratot és egyetértést, hogy az útvonal tényleg a terepre kerülhessen? |

A helyi enyhítés mélyebb emelő nélkül hiányos. Egy okos gyökérok-történet támogatás nélkül soha nem hagyja el a füzetet. A támogatás valódi javítás nélkül színház. Egy törvény, egy tilalom vagy egy készpénztranszfer lehet időjárás a táblán — egy már érvényben lévő szabály —, és lehet a történet gyökéroka. Maga a feltalálás továbbra is egy képesség-útvonal: valami szűkös itt bőségesebbé válik.

### Szavak

A közreműködők elcsúsznak, amikor két dokumentum két nevet használ. A kiszállított, tanulóknak szóló szöveg a mérvadó.

| Mondd a tanulóknak | Kódban vagy régebbi tervjegyzetekben |
|--------------------|--------------------------------------|
| Quest | mission (adatban és fájlnevekben rendben van) |
| Friends | multiplayer |
| Start Quest | start race |
| Feltörekvő tech; **emTech**, miután definiálták | emTech az első képernyőn |
| Support (a tanulói erőforrás) | political will, `state.will` |
| Válságmérő-címkék (Floods, Trust, …) | „resources” ezekre a mérőkre |
| Look Ahead, aztán **Wait +2 years** | puszta „Wait” gombfeliratként |
| Pathway held / improved / collapsed | „place held” mint termékelem |

A földrajzi nevek (`mission.place`, „Rotterdam”) a történetben maradnak. A belső fájlokat továbbra is hívhatják `game.js`-nek. A termék neve **Future Forge** marad.

---

## Egy menet

1. **Téma.** Válassz egy globális problémát. A témák a `GLOBALS`-ban élnek a [js/data.js](../js/data.js)-ben: néhány tucat probléma hat polcon (egészség, klíma és víz, élelmiszer és föld, tanulás és munka, biztonság és jogok, hosszú távú kockázatok). Egy rövid „start here” sor rögzíti a klímát, a vizet, a fertőző betegségeket, az oktatást, az energiahozzáférést és a szélsőséges szegénységet. Minden téma vagy egy most jelen lévő kár, vagy egy megelőzendő kár.
2. **Quest.** Olvass egy rövid problémabrífet, miközben a Future Forge több konkrét helyet vázol. Válassz egyet. A megoldott Questek elérhetőek maradnak. A böngésző a forgatókönyveket a `localStorage`-ban cache-eli.
3. **Feltalálás a hex-táblán.** A tábla a válságmérőkkel indul (egy Quest némelyiket elrejtheti). Válassz egy feltörekvő technológiát, kérj ötleteket vagy írd le, hogyan működik, és bocsáss ki egy feltalálási csempét. Húzd rá. A **Bits** lapok (kék, balra) bitekhez kapcsolódnak. Az **Atoms** lapok (rózsaszín, jobbra) atomokhoz kapcsolódnak. Az átalakítók mindkettőt hidalják. Egy kék lap egy rózsaszín lappal szemben elutasítva: a szoftver nem fog meg egy propeller. Ez az elutasítás a tanulság.
4. **Lámpák.** A válságmérők és később a kihívók jelzőlámpák: piros (forró vagy megválaszolatlan), sárga (feszített), zöld (enyhített). Egy feltalálás lehelyezése vagy felemelése újraértékeli a szomszédos lámpákat. A tábla nézése a gondolkodás. Minden feltalálási csempe megvalósíthatósági sávot is visel: őszinte-e ez az állítás ebben az évben?
5. **Kemény kérdések.** Amikor készen vagy, hívd a kihívókat a táblára — alapból egyet, legfeljebb négyet: **Moloch** (rendszerösztönzők), **Ethicist** (kemény kompromisszumok), **Stakeholder** (hivatalnokok és közösség), **Mother Nature** (a fizikai világ). Enyhítsd a lámpáikat őszinte ötletekkel.
6. **Tartás vagy bukás.** Amikor minden aktív lámpa sárga vagy zöld, jelentsd ki, hogy az útvonal tart. A **Look Ahead** / **Wait +2 years** lépteti a naptárat, és emeli a válságot. A Quest elbukik, ha bármelyik mérő eléri az 5-öt, vagy beköszönt az összeomlás éve.

A **Learn** egy technológiai kártyán ismertetőt nyit. A társfeltaláló ötletel és tutorál. Te erősítesz meg mindent, ami a táblára kerül.

Egy hexnek hat szomszédja van, ezért egyetlen feltalálás nem érhet el minden adott lámpát. A klaszter a feltalálás. Egy mérőnek, amely már sárga vagy zöld, nem kell szomszéd.

---

## Funkciók

### Hex-tábla és a feltörekvőtech-tálca

Minden, amit mozgatasz, hatszögletű csempe: feltalálások, válságmérők, kihívói aggodalmak és érvek. A hely és a megnevezett személy történet, nem csempe. A csempék nem forognak. Minden hex egy kép tiszta üveg alatt. A színjelentés a peremen, a lámpán és a megvalósíthatósági sávon él — a zöld jelzőlámpa, soha nem egy „világ.”

Egy érv egy már a táblán lévő értékelés elleni eset. Ha egy útvonal le van helyezve, a Write freely-vel írd meg az esetet, és bocsáss ki egy érvet. Minden kibocsátás 1 AP-ba kerül. Egy tényellenőrzés a modell saját tudása és keresése alapján elfogadja vagy elutasítja az esetet. Nem olvassa a Quest groundingját. Amíg ez az ellenőrzés fut, a csempe szürke, pörgő peremmel ül a táblán. Egy elfogadott érv, amely élt oszt egy útvonallal, extra bizonyított tény annak az útvonalnak a pontszámához és az általa érintett feltalálási csempék időzítéséhez. Előrébb rangsorol, mint a Quest groundingja, és enged egy kemény korlátnak a briefingben. Egy elutasított érvet el lehet olvasni és mozgatni, és egyik bíróhoz sem küldik el.

A világok csak a feltalálási csempékre vonatkoznak:

| Szegély | Világ | Példák |
|---------|-------|--------|
| Mind a hat kék | bits | SI, networks, computing, gene sequencing |
| Mind a hat rózsaszín | atoms | drones, energy, robots, transport |
| Osztott — balra kék, jobbra rózsaszín | converter | IoT, 3D printing, materials, synthetic biology, VR |

Két hex csak akkor kapcsolódik, ha az érintkező lapok ugyanahhoz a világhoz tartoznak.

A katalógus **29** mindig választható kártya a [js/data.js](../js/data.js)-ben (`TECHS`), hat tálcatartományba (`DOMAINS`) csoportosítva:

| Tartomány | Ami ott ül |
|-----------|------------|
| **Power** | Computing, energy, crypto, quantum, geothermal, tidal, solar, wind, wave, nuclear, batteries |
| **Automator** | Super intelligence, robots |
| **Mover** | Networks, transportation, self-driving, drones, quantum internet, space |
| **LifeForce** | Synthetic biology, brain-computer interfaces, genetic engineering, gene sequencing, alternative proteins |
| **Link** | Virtual reality (a VR/AR család) |
| **Portal** | 3D printing, Internet of Things, materials, nanotechnology |

Ez a régebbi tizenegy családos térkép gyakorlatban használható metszete: computing, clean energy, crypto, SI, robots, networks, transportation, VR/AR, IoT és érzékelők, gyártás és anyagok, valamint life tech. A finomabb kártyák (napenergia versus „energia”, szekvenálás versus szintetikus biológia) azok, amelyekkel ténylegesen feltalálsz. Minden kártyának van képességsora, ismertetője, használati esetei, kockázatai és szinergiapartnerei (`pairs`). A `readyYear` puha horizont-utalás, nem zár.

A **For this place** először a Quest Spotlightját mutatja, aztán legfeljebb négy támogató technológiát, mindegyiket egy `suggestedWhy` mondattal. Az **All emerging tech** össze van csukva, amíg ki nem nyitod. Az állapot Questenként él.

Vizuális szándék, beleértve a kiszállított Workshopot megelőző részleteket: [workshop-hex-invent-surface.md](workshop-hex-invent-surface.md).

### Attention, Budget és Support

Három készlet ül a válságmérők mellett. A válságmérők a helyé. Ez a három a tanulóé.

| Tanulói felirat | Kód | Mi ez |
|-----------------|-----|-------|
| **Attention** (AP) | `state.ap` | A cselekvési ablak. Egy kör első gondolkodási kérése 1 AP-ba kerül. Az adott kör további gondolkodása ingyenes. Az ítélés és a beküldés továbbra is Attentiont fogyaszt. |
| **Budget** | `state.budget` | Tőke. Ez egy készlet: a kör vége az Attentiont tölti újra, nem a Budgetet. |
| **Support** | `state.will` | Politikai akarat — jóakarat, amelyet elkölthetsz. A régebbi tervjegyzetek „political will”-t mondanak. A HUD Supportot mond. Egy válságmérőt is hívhatnak Trustnak; az a mérő a helyé, nem ez az erőforrás. |

**Kétfelvonásos gazdaság.** Egy idei helyi szigetmegoldás ne fejezze be a gyökérok-mérőt is. Később, őszintébb képességek — miután a naptár mozdult — a második felvonás. Amikor egy pontozott útvonal enyhít egy válságszerepet, **+1 Budgetet fizet minden újonnan enyhített szerepért**, szerepenként egyszer ebben a Questben. Ez a fizetség finanszírozza a második felvonást. A szerzők a gazdaságlaborral hangolják a kezdő mérőket és a pénztárcát, hogy egy Quest **challenging** legyen: megoldható, mielőtt a mérők pirosra váltanak, de nem triviális az első évben. Lásd: [quest-economy-lab.md](quest-economy-lab.md).

### SI-társfeltaláló

A Node-szerver a `POST /api/co-invent` végpontot adja forgatókönyvekhez, ötleteléshez, megvalósíthatósághoz, szomszédos lámpákhoz és kihívásokhoz. A hitelesítő adatok a szerveren maradnak: egy SuperGrok-munkamenet (`grok login`, a `~/.grok/auth.json`-ból olvasva) vagy `FF_XAI_API_KEY`. A böngésző soha nem látja a kulcsot.

Ha egyik hitelesítő sem működik, a felület akkor is betöltődik, és egy **helyi** heurisztikus partner válaszol. Az élő Grok-következtetés és az Imagine-képek addig várnak, amíg a hitelesítés sikerül. Nézd a státuszsort, vagy a `GET /api/health` választ.

Azt, hogy a modell mit tudhat, a hívás dönti el:

- A **grounding** egy Quest-csempén képességigazság (feltörekvő tech, termékkategória, képességek, trendek, egy mérföldkő, használati esetek, alkalmazások, őszinte korlátok). A gyors útvonalak az első 3000 karaktert olvassák. Az őszinte korlátokat tedd előre, különben nem tudnak pirosra fordítani egy lámpát.
- A **tanulói próza** (összefoglaló, brief, jelenet) a történetet mondja, és nem nevezheti meg a választ. Azt a tálca teszi.
- A **tutor-kontextus** (`aiTutorContext`, Spotlight-előrelépés mezői) csak a tanulási moduloknak szól. A tutor a valós előrelépést azután nevezi meg, hogy a tanulónak megvan a története. A gyors értékelők nem olvassák.

Az Apply gombok továbbra is megerősítenek mindent, ami a táblát változtatná. A társfeltaláló javasol; nem írja meg magától az útvonalat.

Az `FF_CO_INVENT_STREAM=1` lehetővé teszi, hogy a beszélgetős módok kiszolgáló által küldött eseményekként streameljék a választ, amikor a böngésző `Accept: text/event-stream` fejlécet küld. Amíg a modell még gondolkodik, a következtetési nyom egy teljes szélességű Thinking blokk. Az egész akkor csukódik össze, amikor a válasz elindul, és a gondolatok benne maradnak. Ezeket nem küldik vissza a modellnek. A titkosított belső nyomot nem mutatják. Ezek a módok: chat, spark, suggest-stack, draft-name, draft-how, draft-impact, push-further, explain-techs, art-of-the-possible, sit, scamper és complete-picture. A megvalósíthatóság, a pontozás, a forgatókönyvek és a többi bíró továbbra is egy JSON-törzs. Ha a kapcsoló ki van kapcsolva, vagy a mód nincs ezen a listán, ugyanaz a kérés továbbra is egy JSON-törzs, és nem próbálják újra. A hang a saját valós idejű útvonalán marad. A javaslatok a teljes válasz érvényesítése után kerülnek rögzítésre. A kapcsoló alapból ki van kapcsolva. Amikor be van kapcsolva, a `GET /api/health` a `features.coInventStream` értéket jelzi. Az élő, első hasznos mondat késleltetését még nem mérték.

Az `FF_CO_INVENT_PROMPT_COMPACT=1` a beszélgetős társfeltaláló- és tutorfordulókat a rövidebb, közös promptra kapcsolja. Ez a prompt továbbra is tartalmazza a világóra-sort, és a tutornál azt a send-to-read szabályt, amely egy illeszkedő leckeoldalt és annak illusztrációját ajánlja. A gyors értékelő és bíró módok a saját promptjaikat tartják. A kapcsoló alapból ki van kapcsolva, és külön áll a streameléstől.

### Időzítés, az előrejelzésbank és a Look Ahead

Az időzítésnek két eszköze van.

A **képességtrendek** mért sorozatokat modelleznek: költség genomonként, a napenergia kiegyenlített költsége (LCOE), frontier betanítási számítási kapacitás, és így tovább. Minden fájl egy sorozat, összetett kamatszabállyal (duplázódás, feleződés vagy éves összetett növekedés), egy horgonnyal és dátumozott mérföldkövekkel. Az inline **Capability outlook** az Inventben a fókuszált technológia releváns trendjeit mutatja, vagy a kiválasztott stackét, ha nincs fókusz. Válassz egy trendet, hogy lásd a leírását, a modellezett görbét, a Quest évét, a mérföldköveket és a forrásokat; ahol a leírás túlcsordul, a **Read full description** kinyitja a szerzői szöveget. A becslés feltételes arra, hogy a trend folytatódik, és a szerzői tartományán kívül nem adják. A kapcsolódó előrejelzések és mérföldkövek az aktív menet bankjából jönnek, és technológia szerint kapcsolódnak, nem a görbe mérései. A hiányzó lefedettség nem azt jelenti, hogy egy képesség lehetetlen.

A felfedező és a grafikonja csak olvasható: a bizonyíték megtekintése nem lépteti a szimulációt, és nem hoz létre új, mérvadó felhatalmazást az SI számára. A meglévő **Look Ahead** / **Wait +2 years** grafikonok és a HUD év-párbeszédablaka továbbra is elérhető. A hivatalos katalógust a Warmer Sun publikálja (`FF_TRENDS_REMOTE_URL`). Egy Quest beágyazhat `trends` vagy `spotlightTrends` mezőt; a beágyazott trendek azonosító szerint felülírják a katalógustrendeket. Séma: [capability-trend-schema.md](capability-trend-schema.md). Betöltés: [capability-trends-remote.md](capability-trends-remote.md).

**Az előrejelzésbank** egy JSON-fájl, `future-forge.predictions/v1` sémával, induláskor betöltve. A kiszállított alapértelmezés a [predictions/default.json](../predictions/default.json). Az `FF_PREDICTIONS_FILE` beállításával cserélheted (egy útvonal vagy egy `https://` URL). Egy oldalbetöltés lecseréli az alapértelmezettet; nem fésüli össze. A bank hajtja:

- az év párbeszédablakát, amikor megnyitod a naptárat, és a közleményt, miután az év lépett
- a kapcsolódó bizonyítékot az inline Capability outlookban
- a kimenetel-előretekintő kártyákat (egy mérföldkő, egy trend, egy még előttünk álló előrejelzés)
- az **SI-világórát**

Az állítás-időzítési bírónál a már esedékes sorok (`year` ≤ a menet éve) bizonyítottnak számítanak. A legközelebbi, még előttünk álló sorok előrejelzések. Ez az óra **kötelező** a megvalósíthatóság időzítésére: megelőzi a modell memóriáját és a webkeresést. A Quest groundingja akkor is nyer, ha kifejezetten ellentmond egy sornak. Az ötlet-szikrák, a szöveges társfeltaláló, a tutor és a hangos társfeltaláló ugyanennek az órának egy rövidebb szeletét látják, és arra kérik őket, hogy hivatkozzanak, amikor egy előrejelzés visz egy döntést. A pontozás, a kihívásfeltevés és a forgatókönyv-generálás nem olvassa. Részletek: [predictions-bank.md](predictions-bank.md).

Az opcionális élő web- és X-keresés (`FF_AI_SEARCH=1` vagy `--ai-search`) csak az időzítési értékelésre és az Ask for ideas-re vonatkozik. Alapból ki van kapcsolva.

### Future vision, briefing és Read out loud

A **Future vision** egy Imagine-kép a helyről, ahogy az útvonal megkapaszkodik. A szakaszok a mából egy korai építésig, a skálázásig, majd egy új normálisig futnak, ahogy több technológia csatlakozik a stackhez (`VISION_STAGES` a `js/data.js`-ben). A `POST /api/vision` ezeket a képkockákat generálja. A Quest jelenetsora rögzíti a helyszínt.

A **Briefing** a `mission.briefMd` szövegét járja be, kártyánként egy bekezdést (legfeljebb nyolcat), a teljes brief előtt. Az opcionális `briefBeats` szorosabbra fogja a feliratokat, vagy stillképeket szállít.

A **Read out loud** xAI szövegfelolvasást használ (`POST /api/tts`). A szerver a hangot szöveg és hangszín szerint a `data/tts-cache/` alatt cache-eli, hogy a későbbi hallgatók egy fájlt osszanak. Ha az SI nem elérhető, és a sor nincs cache-elve, a böngésző az eszköz hangját használja.

### Hangos társfeltaláló

A Send melletti hullámforma egy Grok Voice-munkamenetet nyit (`POST /api/co-invent-voice/session`). A böngésző WebSocketen beszél a game szerverrel; a szerver továbbítja a hangot az xAI-nak, így az API-kulcs távol marad az oldaltól. Nincs helyi hangos tartalék. A hanghoz élő SuperGrok-munkamenet vagy `FF_XAI_API_KEY`, mikrofon és biztonságos környezet kell (`http://127.0.0.1` vagy HTTPS). Egy kör első kérése továbbra is 1 Attentionbe kerül (tutorálás közben ingyenes). Magát a hívást nem számlázzák megszólalásonként. Egy háttérbe tett lap hang nélkül 90 másodperc után bont; egy nyitott mikrofon a 10 perces alapértelmezett plafonig fut. A Portal nem szolgál ki hangot.

<a id="multi-user-sessions"></a>

## Többszereplős menetek

Két módja van annak, hogy másokkal együtt találj fel. Mindkettő **személyes feltalálásokat** és **egy közös válságot** tart. Ha a hely elbukik, mindenki veszít. A túlélők közötti helyezés akkor számít, amikor az útvonal tart. Versenyezhetsz vagy segíthetsz. A házigazda indítja a Questet. Egy forduló minden hely egy-egy köre. A Look Ahead egyetlen helyen nem emeli a közös mérőket; az asztal körbeérése lépteti az évet.

A tutor mód mindkettőben ki van kapcsolva. Egy másokkal végzett tanulási Quest továbbra is feltalálás, lépésről lépésre haladó tutor nélkül.

A **Friends** élő szoba. A címlapról: **Create room**, aztán oszd meg a csatlakozási címet és a szobakódot. Mindenki a saját böngészőjét használja. A cím, amelyet a csatlakozók megnyitnak, a `FF_JOIN_ORIGIN` (gyakran egy Tailscale Funnel-gazda, például `https://….ts.net`). A tervezett méret egy kis asztal, nagyjából 2–6 ember. Egy Quest-link annak a szervernek a címe, amelyen a Quest van, plusz `?q=<quest-id>`. A nyilvános alkalmazáson ez `https://ff.warmersun.com/?q=<quest-id>`. Egy a game folyamatot futtató laptopon ez `http://127.0.0.1:8765/?q=<quest-id>`. A link nem vihető át szerverek között. A Quest-azonosító igen. Azt a linket tedd ki, amelyről megosztasz.

A **Hotseat** ugyanaz a menet egy gépen. A **Start hotseat** vesszővel elválasztott helyneveket vár. Amikor egy kör véget ér, add tovább az eszközt. A szabályok a Friendsével egyeznek; a szállítás a laptop az asztal közepén.

A hosszú mechanikai vázlat, a [game-and-multiplayer-design.md](game-and-multiplayer-design.md), tervezési dokumentum. A „current architecture” szakasza egy régebbi hurkot ír le. Ez a kézikönyv és a README azt írja le, ami száll. Az a vázlat továbbra is tartja a szándékot: személyes feltalálások, közös válság, túlélni, aztán rangsorolni.

<a id="learning-quests"></a>

## Tanulási Questek

Egy tanulási Quest egy friss előrelépést tanít, és továbbra is arra kéri a tanulót, hogy találjon fel. Ez egy Spotlight-csempe, bekapcsolt tutor móddal.

Állítsd be: `isLearningModule: true`. A hosztolt katalóguson egy tanulási modul **alapból bejelentkezést kér** (`access: "account"`), hacsak a csempe mást nem mond. A feltalálás a lépéses briefinggel nyílik. Az SI-tutor a társfeltaláló lapon ül, amikor a tanuló kinyitja. **Egyszerre egy ötletet** tanít, rövid bekezdésben, érettségizőnek, és nem zúdítja rá a megoldást. Miután a tanulónak megvan a története, a tutor megnevezi a valós előrelépést (`spotlight.advanceTitle`, `advanceSummary`, `asOf`): a családot, hol ül a görbén, mi vált most lehetővé, mi van még előtte.

Az `aiTutorContext` rejtett tanterv csak annak a tutornak: leckecél, sorrend, olvasmányok, illusztrációk, tévképzetek, feltalálási kapu. A gyors értékelők (időzítés, pontozás, kihívás) nem olvassák. A képességigazság a `grounding`-ban marad. A tanulói próza továbbra sem nevezi meg a technológiát válaszként.

A haladás az eszközön: **Learn · {module title} · Lesson X/Y**, a `lesson` és a `totalLessons` mezőkből (mindkettő kell a sávhoz) és egy közös `module` címből. Egy többleckés út egy `kind: "module"` burkoló plusz leckénként egy teljes Quest-fájl, ugyanazzal a címmel és ugyanazzal a `totalLessons` értékkel, a leckék sorrendben számozva. A katalógus egy modulkártyát mutat. A motor nem zárja a 2. leckét az 1. lecke mögé; a burkoló `lessons` listája a sorrend. A befejezett leckék a `localStorage`-ból töltik a szegmenssávot.

A leckeoldalak egy **`.ffquest`** zipben szállnak a csempékkel: `lessons/<folder>/*.html` és illusztrációk. A tutor felajánlhatja az egyik ilyen oldalt, miután elmagyarázta az ötletet. A csevegés a beszélgetés. Az oldalak a tankönyv. Formátum: [quest-package.md](quest-package.md). Készítés: [skills/future-forge-quest/references/learning-and-sponsor.md](../skills/future-forge-quest/references/learning-and-sponsor.md).

A nem szponzorált tanulási utak a **Learning** katalógusban jelennek meg, a Warmer Sunról letöltve (`https://warmersun.com/quests/catalog.json`), nem a helyi `quests/` mappából. Egy helyi másolat vagy egy import a **Library** alatt jelenik meg, ugyanúgy csoportosítva.

<a id="sponsored-quests"></a>

## Szponzorált Questek

Egy szponzorált Quest megnevez egy partnert, és továbbra is feltalálást kér. A feltüntetés csak megjelenítés: nincs pontszámprémium, nincs kényszerített tálca, nincs eladási mód a társfeltalálóban.

| Mező | Amit a tanuló lát |
|------|-------------------|
| `sponsorName` | **Sponsored by {name}**, és a chip **Sponsored · {name}** |
| `sponsorBanner` | Egy sima szöveges tagline e címke alatt. Nem egy kép-URL |

A feladat továbbra is kimenetel a helyen élő embereknek. A márka megnevezése nem a megoldás. A termék egyszer megjelenhet, mint az a példány, amely elért egy mérföldkövet, a `grounding`-ban. A feloldások és az alkalmazások kategóriaszinten maradnak. A tanulóknak szóló történet, összefoglaló és feladat nem követeli a terméket.

Egy szponzorált tanulási út (ha a burkoló vagy bármelyik lecke `sponsorName` mezőt visel) a **Sponsored** alatt szerepel, akkor is, ha egyúttal modul. Másodszor nem szerepel a Learning alatt. A hivatalos Sponsored csempék ugyanabból a Warmer Sun-katalógusból jönnek, mint a Learning. A katalógus frissítése átugorja a szerver ~10 perces cache-ét.

A `grounding` a gyakorlatban kötelező. A készség szövegszabályai, valamint az egyleckés versus többleckés formák a [learning-and-sponsor.md](../skills/future-forge-quest/references/learning-and-sponsor.md) fájlban vannak.

## Kísérő Questek

Egy kísérő egy szokásos Quest egy opcionális forrással: egy podcast, egy bejegyzés vagy egy másik megjelent darab, és egy mozdulat (egy mérföldkő, egy trend, egy ötlet, egy vélemény vagy egy előrejelzés). A tanuló ezt a forrást és egy kérdést lát a menet előtt. A feltalálás továbbra is a Quest.

A szponzori feltüntetés és a forrásfeltüntetés különböző sorok. A **Sponsored by** csak akkor jelenik meg, ha a `sponsorName` be van állítva. Az aláírás a beszélő vagy a szerző. A Future Forge mondhatja, hogy ő írta az olvasmányt. Ez a mondat nem partnerség.

A katalóguskártya azt mondja: **Open** és `From {show or publication}`. Az indítás a workshopot nyitja. A cím alatti sáv tartja a forrásfeltüntetést, a meghívást, és ha a Quest úgy mondja, a **For this Quest, assume…** sort. A tanuló által írt útvonal a hozzájárulás. A végén a **Back to the idea** egy opcionális jegyzet. Nem igazolja a forrást.

Az SI egy rövid forráskorlátot olvas a `grounding` mellett, plusz egy strukturált forrásvizsgálatot, amikor a Questnek van egy állítása. Explicit forgatókönyv-felhatalmazáson kívül egy ötlet, egy vélemény, egy trend vagy egy előrejelzés nem aktuális képesség. Egy mérföldkő csak annyira szilárd, amennyire a bizonyítéka. Az egyet nem értés érvényes feltalálás.

Készítés YouTube-videóból, podcastból, blogból vagy X-bejegyzésből: [future-forge-companion](../skills/future-forge-companion/). Terepi szabályok: [companion.md](../skills/future-forge-quest/references/companion.md). A kidolgozott példa a Moonshots 304. epizódja, `companion-moonshots-304`, fejlesztői szerveren.

## Egyéb Questek

Minden Quest egy válságepizód: egy téma, aztán egy helyi probléma.

| Fajta | Honnan jön |
|-------|------------|
| **Shipped missions** | Kézzel írt helyiek a `MISSIONS`-ben, a `js/data.js` belsejében, plusz a társfeltaláló által vázolt és a böngésző által cache-elt forgatókönyvek |
| **Library / External** | JSON-csempék a repo `quests/` mappájában (`FF_QUESTS_DIR` a felülíráshoz), vagy **Import Quest…** / egy ejtett fájl a címlapon. Ez a tantermi oldalbetöltés |
| **Spotlight** | Egy valós, friss képesség, fiktív helyként megírva. A tálca a Spotlightra és 2–4 partnerre utal. A tanulói próza nem nevezi meg a technológiát válaszként |

A Spotlight pedagógiája: kutass egy valós előrelépést, írj egy fiktív válságot, ahol ez a képesség őszinte illeszkedés, tedd a történetet a `briefMd`-be (a hely, a nagyobb probléma és a gyökéroka, aztán egy csak kimeneteles feladat), a képességigazságot pedig a `grounding`-ba.

Séma és mezőklipek: [quest-tile-schema.md](quest-tile-schema.md). Mappa és távoli katalógus: [quests/README.md](../quests/README.md).

Egy tanulási Quest, amely leckeoldalakat tartalmaz, egy **`.ffquest`** fájlként száll: a csempe (vagy egy modulburkoló plusz a leckéi) és a lecke-HTML zipje. A game továbbra is a Quest JSON-t futtatja. A csomag az a boríték, amely egy készítői könyvtárból a warmersun.com-ra mozog. Formátum: [quest-package.md](quest-package.md).

```bash
npm run validate:quest -- path/to/quest.json --strict
npm run economy:quest -- path/to/quest.json
npm run pack:quest -- <srcdir> -o <id>.ffquest
```

A `--strict` a mesterségbeli figyelmeztetéseken bukik el (technológia megnevezve a tanulói szövegben, vékony grounding, sablonmaradék, és a többi). A gazdaságlabor célzott ítélete a **challenging**. A fejlesztői mód (`npm run start:developer` vagy `FF_DEVELOPER=1`) feloldja az inspect felületet és a labort a `/tools/quest-economy` címen. A produkciós `npm start` a fejlesztői módot kikapcsolva hagyja. A kliens a zászlót a `/api/health`-ből olvassa; nincs URL-felülírás.

### Gyűjtőkártyák

Egy gyűjtőkártya egy valós képesség, általános kifejezésekkel, nincs rajta gyakorolható helyszín. A tanuló megnyit egy nyilvános linket, begyűjti a kártyát egy könyvtárba, és **ingyenes, újrafelhasználható feltalálási csempeként** használja bármely táblán. A kártya technológiája akkor ingyenes, ha az az egyetlen csempe ebből a technológiából. A gyűjtemény használatához bejelentkezés kell.

A készítés `cards/<slug>.json` fájlt ír egy 16:9-es oldalkép mellé. Ellenőrzés: `npm run validate:collector-card`. A publikálás (`scripts/issue-collector-card.sh`) megírja a kártyát, és kiírja a `/card/<uuid>` címet; adatbázist igényel, és csak akkor való, amikor tényleg linket akarsz kibocsátani.

### Fiókok, és a két folyamat

A bejelentkezés opcionális. A bejelentkezés nélküli használat teljes. A böngészőállapota (forgatókönyv-cache, megoldott Quest-azonosítók, könyvtárimportok, felületi beállítások) a `localStorage`-ban él, amíg a tanuló be nem jelentkezik.

| Folyamat | Parancs | Szerep |
|----------|---------|--------|
| **game** | `npm start` → `server.mjs` | A gyakorlat: statikus alkalmazás, társfeltaláló, látvány, hang, Friends WebSocketek. Nincs Clerk, nincs Neon. |
| **portal** | `npm run portal` → `portal/server.mjs` | A Warmer Sun Cloud HTTP API-jai: Clerk, Neon, Quest-táblák, webhookok. Nincs game felhasználói felület. A Render ezt futtatja. |

Mindkettő alapból a **8765**-ös porton indul. Ne futtasd őket együtt. A game-et az `FF_PORT`-tal írd felül. A Render a `PORT`-ot állítja be a portálnak.

A tanulói identitás egy Clerk-munkamenet. A bejelentkező űrlap a Clerk Account Portalja a `https://accounts.warmersun.com/sign-in` címen. A hosztolt game a `https://ff.warmersun.com` címen betölti a Clerket. A helyi game soha nem tölti be a Clerket; a Sign in chip az Account Portalt nyitja, és a `https://cloud.warmersun.com/signin` eltárol egy munkamenet-JWT-t. Állítsd be a game-en az `FF_PORTAL_URL`-t a portál eredetére. Bejelentkezés után a Cloud importálhatja a helyi megoldott készletet; innentől a felhő a megoldott azonosítók forrása. A Cloud álláspontja és a funkcióleltár: [warmer-sun-cloud.md](warmer-sun-cloud.md).

Két hitelesítőt könnyű összekeverni:

- A **Clerk** a tanulói fiók (csak portál).
- A **SuperGrok vagy az `FF_XAI_API_KEY`** az SI-szolgáltató (csak game).

A helyi használathoz egyik sem kell.

<a id="self-hosting"></a>

## Saját üzemeltetés

A gyakorlat egy Node-folyamat, amelyet te futtatsz. Az `npm start` (`server.mjs`, 8765-ös port) kiszolgálja az alkalmazást, a társfeltalálót, a látványt, a hangot, a szövegfelolvasást és a Friendst azon a gépen. Nem kell hozzá Warmer Sun Cloud, Clerk vagy Neon. A bejelentkezés nélküli használat a böngészőben a teljes hurok.

Tedd ezt a folyamatot szerverre, amikor másoknak is el kell érniük. Irányítsd az `FF_JOIN_ORIGIN`-t a nyilvános URL-re (a szokásos Friends-út egy Tailscale Funnel-gazda). A SuperGrok-munkameneted vagy az `FF_XAI_API_KEY` azon a szerveren marad. Tölts be saját Questeket (`FF_QUESTS_DIR`), előrejelzésbankot (`FF_PREDICTIONS_FILE`) és trendkatalógust (`FF_TRENDS_REMOTE_URL`). Állítsd be az `FF_QUESTS_REMOTE_URL=off` értéket, amikor a szobának csak azokat a csempéket szabad látnia, amelyeket a `quests/` alá tettél.

A GPL ezt bármilyen célra megengedi, beleértve egy találkozót, egy nyilvános szervert, egy iskolát és egy céget ([COMMERCIAL.md](../COMMERCIAL.md)). Iskola, egyetem, bootcamp vagy képző szervezet saját üzemeltetésben futtathatja beiratkozott tanulóknak. Ez az eset az [Órák](#classes). Cég vagy fizetett hoszt is futtathatja. A licenc szövege: [LICENSE.md](../LICENSE.md).

Az `npm run portal` a Warmer Sun Cloud API-folyamata (Clerk, Neon, Quest-táblák). A Render ezt futtatja. Nem kell a gyakorlat saját üzemeltetéséhez, és nem szolgálja ki a game felhasználói felületét. Ne kösd a game-et és a portált ugyanahhoz a porthoz.

A telepítés, a környezetfájlok és a keményítés a [README](../README.md)-ben marad.

<a id="classes"></a>

## Órák

Egy óra emberek plusz egy Quest-mappa egy saját üzemeltetésű game-en. Nem külön terméküzemmód, és az alkalmazás nem száll névsort, osztályzatkönyvet vagy határidőket.

1. Futtasd a game-et (`npm start`, vagy a szervert a [Saját üzemeltetés](#self-hosting) szerint).
2. Tegyél ellenőrzött Quest JSON-t a `quests/` (vagy `FF_QUESTS_DIR`) alá. A szerver induláskor beolvassa ezt a mappát. A tanulók ezeket a csempéket **External** Questekként látják, a lista élén, a Friendsben is. Egy arany External jelvény jelöli őket.
3. Opcionálisan kapcsold ki a távoli Sponsored és Learning katalógust az `FF_QUESTS_REMOTE_URL=off` értékkel, hogy a szoba katalógusa a választott mappa legyen.
4. Találjatok fel együtt egy [többszereplős menetben](#multi-user-sessions): Friends szobában (minden tanuló a saját laptopján) vagy hotseatben (egy laptop, add tovább az eszközt). A szóló használat ugyanezzel a mappával szintén működik.
5. Tanított sorozathoz használd a [tanulási Questeket](#learning-quests): egy modulburkolót, leckecsempéket és egy oldalakat tartalmazó `.ffquest` fájlt. A tutor szólóban fut. Friends szobában ugyanazok a csempék továbbra is a feltalálás, tutor mód nélkül.

Az **Import Quest…** a címlapon az eszközönkénti alternatíva, amikor nem tudsz fájlokat tenni a szerverre. A fájl abban a böngészőben a Libraryba kerül.

Iskola, egyetem, bootcamp vagy képző szervezet saját üzemeltetésben futtathatja beiratkozott tanulóknak, beleértve egy többszereplős óraszervert. A GPL fedi ezt a használatot. Lásd: [COMMERCIAL.md](../COMMERCIAL.md).

---

<a id="agent-skills"></a>

## Ügynökkészségek

Öt MIT-készségcsomag él a [skills/](../skills/) alatt. Bármely ügynök-harnessnek megtanítják, hogyan kutasson és írjon hordozható JSON-t. Az alkalmazást nem licencelik újra. Az alkalmazás GNU GPL 3-as vagy későbbi verzió; csak a készségfák és a példáik MIT-esek. Minden csomag a `SKILL.md` elolvasásával működik. Egy szimbolikus link egy hám skills könyvtárába opcionális.

Ebben a checkoutban a quest, a predictions, a companion és a gyűjtőkártyák a `.grok/skills/` alól is linkelve vannak, hogy az itteni ügynökök megtalálják őket. A képességtrendeket közvetlenül a `skills/future-forge-trends/` olvassa.

| Készség | Amit írsz | Amit hajt | Ellenőrzés |
|---------|----------------|-----------|------------|
| [future-forge-quest](../skills/future-forge-quest/) | Egy Spotlight Quest-csempe. Egy oldalakat tartalmazó tanulási Quest egy `.ffquest` fájlba is csomagolódik | Library, External Questek, Sponsored és Learning katalógusok, a briefing, a grounding minden SI-ítélethez, tutor mód | `npm run validate:quest -- <file> --strict` és `npm run economy:quest -- <file>` (ítélet: **challenging**) |
| [future-forge-predictions](../skills/future-forge-predictions/) | Egy `future-forge.predictions/v1` bank dátumozott mérföldkövekből, trendekből és előrejelzésekből, forrásmegjelöléssel | Capability outlook, év párbeszédablak, kimenetel-előretekintő kártyák, az SI-világóra | `npm run validate:predictions -- <file>`, aztán `FF_PREDICTIONS_FILE=<file> npm start` |
| [future-forge-companion](../skills/future-forge-companion/) | Egy kísérő Quest egy YouTube-videóból, podcastból, blogból vagy X-bejegyzésből, plusz a felhatalmazási sorok, amikor a premisszát feltételezik | A forrás-szakasz a menet előtt, és a bank, amelyet az a Quest rögzít | A fenti Quest- és előrejelzés-ellenőrzések. Eljárás: az a készség |
| [future-forge-trends](../skills/future-forge-trends/) | Egy mért képességsorozat (`future-forge.capability-trend/v1`): összetett kamat, horgony, mérföldkövek. Nincsenek kitalált statisztikák | Inline Capability outlook és Look Ahead grafikonok; opcionális beágyazás egy Questen | `npm run validate:trend -- <file>` |
| [future-forge-collector-cards](../skills/future-forge-collector-cards/) | Egy képességkártya plusz egy testvér oldalkép | Nyilvános `/card/<id>` oldal; begyűjtés után ingyenes, újrafelhasználható feltalálási csempe | `npm run validate:collector-card -- cards/<slug>.json` |

Quest kemény szabályok, amelyeket érdemes ismerni, mielőtt csempét szerkesztesz: a Spotlight-azonosító a `mission.suggested` 0. indexe, 2–4 támogató azonosítóval; a tanulóknak szóló próza soha nem nevezi meg ezeket a technológiákat vagy egy terméket válaszként; a `briefMd` így fut: The place → The bigger problem → Your job (csak kimenetel); a `grounding` tartja azt az igazságot, amelyet a modellnek tiszteletben kell tartania; az új mérők alapból local 3↑1, global 2↑1, support 2↑0. A készség `references/` mappája a karakterklipeket, a próza mesterségét, a lint-kódokat és a gazdaságot írja le.

Az előrejelzések azt változtatják, milyen keményen ítélik meg az időzítést. Az éveket őszintén helyezd el. Az esedékes sorok „már valóságossá” válnak. A még előttünk álló sorok előrejelzések maradnak. A kiszállított alapértelmezés forrásmegjelölés nélküli sorokat is kever; a `predictions/examples/musk-abundance.json` a forrásmegjelölt példa.

A trendek ábrázolható tények: a horgony és a mérföldkő értékeinek nullánál nagyobbnak kell lenniük (logaritmikus skála), a státusz pedig `reached` vagy `predicted`.

Érdemes utánozni való példák:

- Előrejelzések: `skills/future-forge-predictions/examples/musk-abundance.json`
- Trendek: `skills/future-forge-trends/examples/` (szekvenálási költség, napenergia LCOE, frontier betanítási számítási kapacitás, és mások)
- Kártyák: `cards/examples/`

---

## Üzemeltetés

Követelmények: **Node.js 18+** (20.9+, ha bekapcsolod a Clerket). A teljes SI-hez és a látványhoz SuperGrok vagy xAI-kulcs kell. Nélkülük a statikus használat és a helyi társfeltaláló továbbra is fut.

```bash
git clone https://github.com/warmersun/future-forge.git
cd future-forge
npm install
npm start
```

Nyisd meg: **http://127.0.0.1:8765**. Másold a `.env.example` fájlt `.env`-vé a game-hez, és a `.env.portal.example` fájlt `.env.portal`-lá a portálhoz. Soha ne commitold egyik fájlt sem.

Tartalmi beállítások:

| Env | Hatás |
|-----|-------|
| `FF_QUESTS_DIR` | A Quest JSON Library-mappája (alapértelmezés: `quests/`) |
| `FF_QUESTS_REMOTE_URL` | Sponsored / Learning katalógus. Ha nincs beállítva, először egy helyi Warmer Sun checkoutot kedvel, aztán a `https://warmersun.com/quests/catalog.json` címet. Az `off` kikapcsolja a távolit |
| `FF_TRENDS_REMOTE_URL` | Képességtrend-katalógus. Ugyanez a minta; a csomagolt fixture-ök a kapcsolat nélküli tartalék |
| `FF_PREDICTIONS_FILE` | Lecseréli az előrejelzésbankot |
| `FF_PORTAL_URL` | Game → portál eredete a Sign inhez |
| `FF_XAI_API_KEY` | xAI-kulcs, amikor nincs SuperGrok-munkamenet |
| `FF_XAI_MODEL` | Szövegmodell (a példa env a `grok-4.7`-et használja) |
| `FF_JOIN_ORIGIN` | A nyilvános URL, amelyet a csatlakozók megnyitnak, hogy belépjenek egy szobába |
| `FF_DEVELOPER=1` | Fejlesztői inspect és a gazdaságlabor |
| `FF_AI_SEARCH=1` | Web- és X-keresés az időzítésen és az ötlet-szikrákon |
| `FF_CO_INVENT_STREAM=1` | A beszélgetős társfeltaláló szövegének streamelése, amikor a kérés `text/event-stream` választ kér. A többi mód egy JSON-törzs marad. A hang változatlan. Alapból ki van kapcsolva |
| `FF_CO_INVENT_PROMPT_COMPACT=1` | Rövidebb beszélgetős társfeltaláló- és tutorprompt. Megtartja a világóra-sort és a tutor send-to-read illusztrációját. Alapból ki van kapcsolva |
| `FF_USAGE_ENABLED=1` | Token-, kép-, TTS- és munkamenet-összesítők a `data/usage/` alatt |

A folyamat a nyilvános erőforrások engedélyezési listáját szolgálja ki (`index.html`, `css/`, kliens `js/`, `assets/`). Nem szolgálja ki HTTP-n a `.env`, a `server.mjs` vagy a `data/` tartalmát. A költséges útvonalak ráta-korlátozottak. Az `FF_API_SECRET`, az `FF_ADMIN_TOKEN` és az `FF_TRUST_PROXY` egy általad ellenőrzött hoszthoz valók; lásd a README-t, mielőtt bekapcsolnád őket.

A `GET /api/health` a nyilvános társfeltaláló-ellenőrzés. A részletes egészség és a `GET /api/usage` csak loopbackről érhető el, hacsak nem adod át az admin tokent. A promptok és a tanulói szövegek nincsenek tárolva a használati naplókban.

Üzembe állítási vázlat: a gyakorlat egy hosszan futó Node-folyamat. A Warmer Sun Cloud a Renderen csak a **portált** futtatja (`render.yaml`): Clerk-kulcsok, `DATABASE_URL`, `FF_TRUST_PROXY=1`, nincs xAI-kulcs. Az emberek a **game** folyamaton gyakorolnak, az `FF_PORTAL_URL` arra a szolgáltatásra mutatva. A teljes lépések, a keményítés és a hangkorlátok a [README](../README.md)-ben vannak.

### Licenc

A Future Forge a Warmer Sun Educationtól, Tamas Simon egyéni vállalkozásától (© 2026), [GNU GPL 3-as vagy későbbi verzió](https://www.gnu.org/licenses/gpl-3.0.html). A kereskedelmi és az oktatási használat megengedett. A program terjesztése a GPL feltételeit viseli. Szöveg: [LICENSE.md](../LICENSE.md) és [COMMERCIAL.md](../COMMERCIAL.md).

Az öt szerzői készség MIT-es, és önmagában is újrafelhasználható. Az SI-szolgáltatók feltételei vonatkoznak minden kulcsra, amelyet használsz.

---

## Hol olvass tovább

| Dokumentum | Mi ez |
|------------|-------|
| [what-is-future-forge.md](what-is-future-forge.md) | Küldetést leíró esszé: célok, 6Ps, az ellentmondás, kinek szól |
| [README](../README.md) | Telepítés, környezet, SI-hitelesítés, keményítés, üzembe állítás |
| [problem-first-invent.md](problem-first-invent.md) | Miért a fájdalomból indul a tálca, és milyen szavakat használ a felület |
| [workshop-hex-invent-surface.md](workshop-hex-invent-surface.md) | A hex-tábla vizuális nyelve. Változási javaslatként írva; a tábla, amelyet leír, az, ami száll |
| [quest-tile-schema.md](quest-tile-schema.md) | Quest JSON: mezők, ki látja őket, karakterklipek |
| [quest-package.md](quest-package.md) | `.ffquest` zip egy Questhez plusz leckeoldalak |
| [quest-economy-lab.md](quest-economy-lab.md) | Nehézségszimulátor; célzott ítélet: **challenging** |
| [predictions-bank.md](predictions-bank.md) | Év párbeszédablak és az SI-világóra |
| [capability-trend-schema.md](capability-trend-schema.md) | Egy mért görbe fájlonként |
| [capability-trends-remote.md](capability-trends-remote.md) | Honnan töltődnek a Wait grafikonok |
| [warmer-sun-cloud.md](warmer-sun-cloud.md) | Portal, Clerk, Neon. Állapotleltár; egyes szakaszok történetiek |
| [game-and-multiplayer-design.md](game-and-multiplayer-design.md) | **Tervezési vázlat.** Friends-szándék és szójegyzék. A benne lévő „as shipped” hurok régebbi, mint ez a kézikönyv |
| [quests/README.md](../quests/README.md) | Csempéket tenni a `quests/` alá, vagy Sponsored / Learning publikálása |
| [predictions/README.md](../predictions/README.md) | Alapértelmezett bank és oldalbetöltési példák |
| `docs/ops/` | Invent nights, Discord és a napi közösségi jegyzetek — nem a termékspecifikáció |

*Future Forge a Warmer Sun Educationtól — feltalálási gyakorlat a hiányzó tantárgyhoz. Származás: 6Ps – Pun Intended (2021).*
