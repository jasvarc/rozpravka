# rozpravka
vygeneruj a precitaj rozpravku na dobru noc z webu

DONE:
- mravne ponaucenie nie je len chackbox, ale rodic ma moznost vlozit text vyjadrujuci mravne ponaucenie
- detsky web pocas citania zvyraznuje prave citane slovo (read-along)
- rodic si moze v rodicovskej sekcii vybrat hlas a rychlost citania z dostupnych hlasov prehliadaca
- rodic moze zadat odporucane dievcenske, chlapcenske a dospelacke mena pre hlavnych hrdinov
- rodicovsky portal ma language selektor (slovencina/anglictina) - po ulozeni sa cela appka, generovane rozpravky aj predvoleny hlas pri citani prepnu do zvoleneho jazyka
- pocas citania sa (ak to rodic povoli checkboxom) prehravaju kratke zvukove efekty, max. raz za 2-3 vety. Zvuky su dynamicke - po vygenerovani rozpravky Claude sam analyzuje jej text a vyberie 5-7 slov (hlavne postavy/prostredie deja), kazde priradi k jednemu z ~28 dostupnych typov zvuku (dazd, drak, vlk, medved, macka, vlak, voda, spliechanie, mágia, kroky...), plus staticky slovnik beznych slov ako zalozna vrstva. Zvuky su syntetizovane priamo v prehliadaci (Web Audio API), ziadny externy zvukovy subor ani API
- PIN textbox v rodicovskej sekcii a textarea na detskej stranke su po nacitani automaticky fokusnute, Enter odosiela (PIN prihlasenie/vytvorenie aj generovanie rozpravky) bez nutnosti klikat na tlacidlo
- appka podporuje viac rodin (multi-tenant): meno je sucastou URL (/rozpravky/meno), kazde meno ma vlastny PIN, nastavenia aj historiu, uplne oddelene od ostatnych. Prazdna URL (/rozpravky bez mena) sa opyta na meno a presmeruje na /rozpravky/meno. Nove meno = cisty stav ako pri prvom spusteni. Specialne meno "admin" otvara samostatny admin portal (vlastny PIN) so zoznamom vsetkych mien a moznostou resetovat PIN alebo natrvalo zmazat konkretne meno. Povodne (jedno-pouzivatelske) data sa migruju jednorazovym skriptom deploy/migrate-legacy-data.js
- rodic v historii rozpravok vidi cely text kazdej rozpravky (rozbalitelne), moze ju oznacit ako oblubenu (hviezdicka) a moze ju natrvalo zmazat. Na detskej stranke pod textboxom je zoznam poslednych 5 rozpravok plus vsetkych oblubenych, kazda s tlacidlami "Vypocut znova" (prehra ulozeny text vratane read-along a zvukovych efektov) a "Pokracovat" - vygeneruje nadvazujuci pribeh s rovnakymi hlavnymi postavami, s moznostou napisat volitelnu poznamku o pridani/odobrati vedlajsej postavy, pricom respektuje aktualne rodicovske nastavenia (mravne ponaucenie, dlzka, zakazane temy...)
- v jednej rodine moze byt viac deti - rodic v portali vytvara/edituje/maze deti (meno, vek, pohlavie). Rozpravky su prisposobene veku dietata (mladsie deti dostanu klasicku rozpravku, pre teenagera Claude napise skor pokojny pribeh nez detsku rozpravku) a rozpravac sa k dietatu prihovara rodom podla pohlavia. Na rozcestovej stranke rodiny je namiesto vseobecneho odkazu "som dieta" tlacidlo pre kazde vytvorene meno; ak rodic este nevytvoril ziadne dieta, zobrazi sa upozornenie nech tak urobi v portali. Kazde dieta ma vlastnu oddelenu historiu rozpravok, ktoru rodic v portali vidi zoskupenu podla dietata (vratane sekcie pre rozpravky zmazaneho dietata)

TODO:
- detsky web bude pocas rozpravania generovat obrazky obsahujuce o com prave citany text je
- rodicovsky veb umozni "naucit sa hlas rodica"