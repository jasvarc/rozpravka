# Nasadenie na Ubuntu server (vedľa Home Assistanta)

Appka beží ako samostatný Node.js proces, ktorý počúva **iba na
`127.0.0.1:3000`** (nie je dostupný zvonka). Verejne prístupná appka je iba
cez existujúci Apache na portoch 80/443, na ceste `https://tvoj-server/rozpravky/`,
vďaka reverse proxy. Do `/var/www/html/rozpravky` sa nekopírujú statické
stránky priamo servované Apache-om (Node.js sám servíruje svoj frontend), ale
je to praktické miesto na uloženie appky vedľa tvojich existujúcich stránok.

## 1. Čo doinštalovať na Ubuntu (raz, pred prvým nasadením)

Ak si Node.js a `unzip` už nastavil, tento krok preskoč. Inak:

```bash
# Node.js LTS (cez oficiálny NodeSource repozitár)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# unzip, ak ešte nemáš
sudo apt-get install -y unzip

# Apache moduly pre reverse proxy
sudo a2enmod proxy proxy_http
sudo systemctl restart apache2
```

Over si verzie:

```bash
node -v
npm -v
```

Balíčky appky (Express, Anthropic SDK a pod.) sú už zabalené v `node_modules/`
v zipe — na serveri sa `npm install` spúšťať nemusí.

## 2. Rozbaľ appku

```bash
cd /var/www/html
sudo unzip rozpravky.zip
```

Vytvorí sa `/var/www/html/rozpravky/` so všetkým potrebným.

## 3. Spusti inštalačný skript

```bash
cd /var/www/html/rozpravky
sudo bash deploy/install.sh
```

Skript:
- vytvorí `.env` s náhodným `SESSION_SECRET` (ak ešte neexistuje),
- nastaví vlastníka súborov na `www-data`,
- zaregistruje a spustí systemd službu `bedtime-story-app` (počúva iba na
  `127.0.0.1:3000`, automaticky sa naštartuje aj po reštarte servera).

## 4. Doplň Anthropic API kľúč

Skript ťa upozorní, ak `ANTHROPIC_API_KEY` v `.env` chýba:

```bash
sudo nano /var/www/html/rozpravky/.env
# doplň ANTHROPIC_API_KEY=sk-ant-...
sudo systemctl restart bedtime-story-app
```

## 5. Nastav Apache reverse proxy

Otvor svoje existujúce Apache vhost súbory (typicky
`/etc/apache2/sites-enabled/000-default.conf` pre port 80 a príslušný
`*-le-ssl.conf` pre port 443, prípadne tvoje vlastné) a do **každého**
`<VirtualHost>` bloku, cez ktorý má byť appka dostupná, pred `</VirtualHost>`
vlož obsah z `deploy/apache-rozpravky.conf`:

```apache
ProxyPass /rozpravky/ http://127.0.0.1:3000/
ProxyPassReverse /rozpravky/ http://127.0.0.1:3000/
```

Ak ti port 80 vhost iba presmerováva na https, stačí tieto riadky pridať len
do `:443` vhostu.

Potom:

```bash
sudo apache2ctl configtest
sudo systemctl restart apache2
```

## 6. Over, že appka beží

```bash
sudo systemctl status bedtime-story-app
```

Otvor v prehliadači `https://tvoj-server/rozpravky/` (alebo `http://`, podľa
toho, ktorý vhost si upravil). Priamo `http://tvoj-server:3000` už nebude
z vonku dostupné vôbec — appka počúva iba na loopbacku.

## Riešenie problémov

Appka teraz loguje každý request (metóda, cesta, HTTP status, trvanie), takže
`journalctl` ukáže presne, čo sa deje:

```bash
sudo journalctl -u bedtime-story-app -f
```

Ak sa v prehliadači zobrazí chyba "Server neodpovedal správne (HTTP ...)",
otvor si Konzolu vo vývojárskych nástrojoch prehliadača (F12 → Console) —
appka tam teraz vypíše presný HTTP status a začiatok tela odpovede, čo pomôže
zistiť, či problém spôsobil Node, alebo už Apache (napr. timeout, chyba proxy
configu). Skontroluj aj Apache error log:

```bash
sudo tail -n 50 /var/log/apache2/error.log
```

Generovanie rozprávky cez Claude API môže trvať aj 20-30 sekúnd. Ak si
`deploy/apache-rozpravky.conf` pridal do vhostu už skôr (pred touto verziou),
nahraď tie dva riadky za aktuálne tri s `ProxyTimeout 90`, aby pomalšie
odpovede nepadali na Apache timeoute.

## Užitočné príkazy

```bash
# logy appky
sudo journalctl -u bedtime-story-app -f

# reštart appky (napr. po zmene .env)
sudo systemctl restart bedtime-story-app

# zastavenie appky
sudo systemctl stop bedtime-story-app
```

## Aktualizácia appky v budúcnosti

Keď dostaneš nový zip s aktualizáciou:

```bash
sudo systemctl stop bedtime-story-app
cd /var/www/html
sudo rm -rf rozpravky_old && sudo mv rozpravky rozpravky_old
sudo unzip rozpravky-novy.zip
sudo cp rozpravky_old/.env rozpravky/.env
sudo cp -r rozpravky_old/data rozpravky/data
cd rozpravky
sudo bash deploy/install.sh
```

(`data/` obsahuje históriu rozprávok a rodičovský PIN, `.env` obsahuje API
kľúč — obe si pri aktualizácii preneste zo starej verzie.)
