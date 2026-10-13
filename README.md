# Gra karciana 66

## Uruchomienie

1. Zainstaluj Node.js w wersji 18 lub nowszej.
2. W folderze projektu uruchom `npm install`.
3. Uruchom grę poleceniem `npm start`.
4. Otwórz w przeglądarce adres `http://localhost:3000`.

Pliki serwera znajdują się w `server/`, a klienta w `client/`.

## Testy

Polecenie `npm test` sprawdza podstawowe reguły rozdania, okna deklaracji i zakończenie rozdania.

## Ostatnie poprawki reguł

- W trybie Lepsza bot wychodzi najwyższą dostępną kartą. Jeśli przeciwnik go złapie, rozdanie kończy się natychmiast na korzyść drużyny przeciwnej.
- Lufa nie może być zgłoszona przez osobę obierającą; obierający może odbić aktywną Lufę. Jeśli Lufa padła po pierwszych trzech kartach, po rozdaniu kolejnych trzech znika możliwość dalszej Lufy.
- W zwykłej grze osiągnięcie 66 punktów gry natychmiast kończy rozdanie i przyznaje punkty ogólne; nie trzeba czekać na zagranie wszystkich kart. W Gorszej nie są naliczane punkty gry — rozliczane są punkty ogólne zależne od wyniku i Lufy.
- Po osiągnięciu 66 punktów ogólnych licznik ogólny zeruje się i przyznawany jest jeden cały punkt.
- Meldunek jest dostępny, gdy gracz ma damę i króla tego samego koloru. Zgłoszenie meldunku automatycznie wychodzi damą; meldunek w atucie daje 40, a pozostałe 20 punktów.
- W nagłówku stołu widoczna jest stawka. Lufa pokazuje też tryb, liczbę odbić i aktualną stawkę. Przykładowo Gorsza za 12 pkt po Lufie jest za 24, po odbiciu za 48, a kolejne podbicie ustawia grę „do końca” za 66 pkt.
- Lufę można odbijać tylko przez innego gracza; własnej Lufy nie można odbić. Boty mogą ryzykować Lufę i odbijać ją.
- Po zgłoszeniu meldunku albo Lufy komunikat pozostaje widoczny przez chwilę. Okno Lufy ma widoczny licznik 10 sekund.
- Po zakończeniu rozdania następne zaczyna się po 10 sekundach; na ekranie jest odliczanie.
