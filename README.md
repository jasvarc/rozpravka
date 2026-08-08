# rozpravka
vygeneruj a precitaj rozpravku na dobru noc z webu

DONE:
- mravne ponaucenie nie je len chackbox, ale rodic ma moznost vlozit text vyjadrujuci mravne ponaucenie
- detsky web pocas citania zvyraznuje prave citane slovo (read-along)
- rodic si moze v rodicovskej sekcii vybrat hlas a rychlost citania z dostupnych hlasov prehliadaca
- rodic moze zadat odporucane dievcenske, chlapcenske a dospelacke mena pre hlavnych hrdinov
- rodicovsky portal ma language selektor (slovencina/anglictina) - po ulozeni sa cela appka, generovane rozpravky aj predvoleny hlas pri citani prepnu do zvoleneho jazyka
- pocas citania sa (ak to rodic povoli checkboxom) prehravaju kratke zvukove efekty, max. raz za 2-3 vety. Zvuky su dynamicke - po vygenerovani rozpravky Claude sam analyzuje jej text a vyberie 5-7 slov (hlavne postavy/prostredie deja), kazde priradi k jednemu z ~28 dostupnych typov zvuku (dazd, drak, vlk, medved, macka, vlak, voda, spliechanie, mágia, kroky...), plus staticky slovnik beznych slov ako zalozna vrstva. Zvuky su syntetizovane priamo v prehliadaci (Web Audio API), ziadny externy zvukovy subor ani API

TODO:
- detsky web bude pocas rozpravania generovat obrazky obsahujuce o com prave citany text je
- rodicovsky veb umozni "naucit sa hlas rodica"
- znova/pokracuj s oblubenou postavou v dalsej rozpravke