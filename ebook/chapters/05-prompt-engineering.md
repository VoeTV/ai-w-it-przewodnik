# Rozdział 5: Prompt Engineering — Sztuka Komunikacji z AI

## Wprowadzenie

W poprzednich rozdziałach wielokrotnie używaliśmy promptów — zapytań kierowanych do narzędzi AI. Być może zauważyłeś, że niektóre prompty dawały lepsze rezultaty niż inne. To nie przypadek. Sposób, w jaki formułujesz zapytanie do AI, ma ogromny wpływ na jakość otrzymanej odpowiedzi.

**Prompt engineering** (inżynieria promptów) to umiejętność formułowania zapytań do modeli AI w sposób, który maksymalizuje jakość, trafność i użyteczność odpowiedzi. To nie jest programowanie w tradycyjnym sensie — nie piszesz kodu. Zamiast tego uczysz się komunikować z AI tak, aby rozumiało Twoje intencje i dostarczało dokładnie to, czego potrzebujesz.

Dlaczego prompt engineering jest ważny dla specjalistów IT?
- **Precyzja** — w IT szczegóły mają znaczenie. Źle sformułowany prompt może dać skrypt z błędem bezpieczeństwa
- **Efektywność** — dobry prompt oszczędza czas na iteracjach i poprawkach
- **Powtarzalność** — raz opracowany dobry prompt możesz używać wielokrotnie
- **Jakość** — lepsze prompty = lepsze odpowiedzi = lepsza praca

W tym rozdziale poznasz:
1. **Podstawowe techniki** — zero-shot, few-shot, chain-of-thought
2. **Zaawansowane techniki** — role prompting, system prompts, constraining
3. **Szablony dla zadań IT** — gotowe wzorce do codziennej pracy
4. **Iteracyjne doskonalenie** — jak poprawiać prompty krok po kroku
5. **Najczęstsze błędy** — czego unikać

## Podstawowe pojęcia

Zanim przejdziemy do technik, wyjaśnijmy kluczowe terminy:

- **Prompt** — tekst (zapytanie, instrukcja, polecenie), który wysyłasz do modelu AI
- **Odpowiedź (response/completion)** — tekst wygenerowany przez AI w odpowiedzi na prompt
- **Kontekst (context)** — informacje, które AI bierze pod uwagę przy generowaniu odpowiedzi (Twój prompt + historia konwersacji)
- **Token** — jednostka tekstu przetwarzana przez AI (w przybliżeniu: 1 token ≈ 4 znaki w języku angielskim, w polskim nieco mniej)
- **Okno kontekstowe (context window)** — maksymalna ilość tekstu, którą AI może przetworzyć jednocześnie (np. 128 000 tokenów w GPT-4o)
- **Temperatura (temperature)** — parametr kontrolujący „kreatywność" AI. Niska temperatura (0-0.3) = bardziej przewidywalne odpowiedzi. Wysoka (0.7-1.0) = bardziej kreatywne, ale mniej przewidywalne
- **Halucynacja** — sytuacja, gdy AI generuje informacje, które brzmią wiarygodnie, ale są nieprawdziwe

## Technika 1: Zero-shot prompting

### Czym jest zero-shot

**Zero-shot prompting** to najprostsza technika — zadajesz pytanie lub dajesz instrukcję bez podawania żadnych przykładów. AI musi „domyślić się" formatu i stylu odpowiedzi na podstawie samego pytania.

**Przykład zero-shot:**
```
Napisz regułę firewall iptables blokującą ruch SSH z sieci 10.0.0.0/8.
```

**Odpowiedź AI:**
```bash
iptables -A INPUT -s 10.0.0.0/8 -p tcp --dport 22 -j DROP
```

### Kiedy zero-shot działa dobrze

- Proste, jednoznaczne pytania
- Standardowe zadania, które AI „zna" z treningu
- Gdy nie zależy Ci na konkretnym formacie odpowiedzi
- Szybkie pytania typu „jak zrobić X"

### Kiedy zero-shot nie wystarcza

- Gdy potrzebujesz odpowiedzi w konkretnym formacie
- Gdy zadanie jest złożone lub wieloetapowe
- Gdy kontekst jest specyficzny dla Twojej organizacji
- Gdy AI daje zbyt ogólne lub nieprecyzyjne odpowiedzi

### Przykłady zero-shot dla IT

```
Wyjaśnij różnicę między TCP a UDP w kontekście VoIP.
```

```
Jakie porty muszę otworzyć na firewallu dla Microsoft Teams?
```

```
Napisz komendę PowerShell, która znajdzie wszystkie pliki większe niż 1GB na dysku C:.
```

## Technika 2: Few-shot prompting

### Czym jest few-shot

**Few-shot prompting** to technika, w której podajesz AI kilka przykładów (zazwyczaj 2-5) pokazujących oczekiwany format wejścia i wyjścia. AI „uczy się" wzorca z przykładów i stosuje go do nowego zadania.

**Analogia:** To jak pokazanie nowemu pracownikowi kilku wypełnionych formularzy przed poproszeniem go o wypełnienie kolejnego.

### Przykład few-shot dla zadań IT

**Prompt:**
```
Konwertuję reguły firewall z formatu Cisco ASA na format iptables. 
Oto przykłady konwersji:

Przykład 1:
ASA: access-list OUTSIDE permit tcp any host 192.168.1.10 eq 443
iptables: iptables -A FORWARD -p tcp -d 192.168.1.10 --dport 443 -j ACCEPT

Przykład 2:
ASA: access-list OUTSIDE deny tcp any host 192.168.1.10 eq 22
iptables: iptables -A FORWARD -p tcp -d 192.168.1.10 --dport 22 -j DROP

Przykład 3:
ASA: access-list OUTSIDE permit tcp 10.0.0.0 255.255.255.0 any eq 80
iptables: iptables -A FORWARD -s 10.0.0.0/24 -p tcp --dport 80 -j ACCEPT

Teraz skonwertuj tę regułę:
ASA: access-list OUTSIDE permit udp host 172.16.0.5 any eq 53
```

**Odpowiedź AI:**
```bash
iptables -A FORWARD -s 172.16.0.5 -p udp --dport 53 -j ACCEPT
```

### Dlaczego few-shot jest potężny

1. **Definiujesz format** — AI dokładnie wie, jak ma wyglądać odpowiedź
2. **Eliminujesz dwuznaczność** — przykłady pokazują jak traktować edge cases
3. **Uczysz konwencji** — Twoje specyficzne nazewnictwo, styl, preferencje
4. **Zwiększasz dokładność** — AI ma „wzorzec" do naśladowania

### Praktyczne zastosowania few-shot w IT

**Generowanie opisów alertów:**
```
Tłumaczę alerty monitoringu na zrozumiałe opisy dla zespołu helpdesk.

Alert: CPU_HIGH host=srv-db01 value=95% duration=15min
Opis: Serwer bazy danych srv-db01 ma bardzo wysokie obciążenie 
procesora (95%) od 15 minut. Może to powodować wolne działanie 
aplikacji. Eskaluj do zespołu DBA.

Alert: DISK_WARN host=srv-file02 value=82% mount=/data
Opis: Dysk /data na serwerze plików srv-file02 jest zapełniony 
w 82%. Przy obecnym tempie wzrostu, dysk zapełni się w ciągu 
2-3 tygodni. Zaplanuj rozszerzenie lub archiwizację.

Alert: MEM_CRITICAL host=srv-app03 value=98% swap=45%
Opis:
```

**Klasyfikacja ticketów:**
```
Klasyfikuję zgłoszenia helpdesk do odpowiednich kolejek.

Zgłoszenie: "Nie mogę się zalogować do komputera, pisze że hasło wygasło"
Kolejka: L1-Password-Reset
Priorytet: Średni

Zgłoszenie: "Serwer produkcyjny nie odpowiada, klienci nie mogą składać zamówień"
Kolejka: L3-Infrastructure-Critical
Priorytet: Krytyczny

Zgłoszenie: "Potrzebuję dostęp do folderu projektowego zespołu marketingu"
Kolejka: L1-Access-Request
Priorytet: Niski

Zgłoszenie: "Outlook ciągle się zawiesza po ostatniej aktualizacji Windows"
Kolejka:
```

## Technika 3: Chain-of-Thought (łańcuch myślenia)

### Czym jest Chain-of-Thought

**Chain-of-Thought (CoT)** to technika, w której prosisz AI o pokazanie procesu rozumowania krok po kroku, zanim poda ostateczną odpowiedź. Zamiast pytać „jaka jest odpowiedź?", pytasz „pokaż mi jak dochodzisz do odpowiedzi".

**Analogia:** To jak proszenie studenta o pokazanie obliczeń na egzaminie, a nie tylko podanie wyniku. Proces rozumowania pozwala wykryć błędy i zrozumieć logikę.

### Dlaczego CoT jest ważny w IT

W IT często mamy do czynienia z problemami wymagającymi analizy wieloetapowej:
- Troubleshooting (symptom → hipoteza → weryfikacja → rozwiązanie)
- Planowanie zmian (analiza wpływu → plan → rollback)
- Analiza bezpieczeństwa (wektor ataku → podatność → ryzyko → mitygacja)

Bez CoT, AI może „przeskoczyć" do odpowiedzi pomijając ważne kroki analizy.

### Przykład CoT w troubleshootingu

**Prompt BEZ Chain-of-Thought:**
```
Użytkownicy nie mogą drukować na drukarce sieciowej HP LaserJet. 
Co jest przyczyną?
```

**Odpowiedź (zbyt ogólna):**
```
Sprawdź czy drukarka jest włączona, czy ma papier, czy jest 
podłączona do sieci, czy sterowniki są aktualne...
```

**Prompt Z Chain-of-Thought:**
```
Użytkownicy nie mogą drukować na drukarce sieciowej HP LaserJet 
(IP: 192.168.1.100). Problem zgłoszony przez 5 osób z tego samego 
piętra. Drukarka wczoraj działała normalnie.

Przeanalizuj ten problem krok po kroku:
1. Jakie są możliwe przyczyny (wymień wszystkie)?
2. Które przyczyny są najbardziej prawdopodobne biorąc pod uwagę 
   że problem dotyczy wielu osób i pojawił się nagle?
3. W jakiej kolejności powinienem sprawdzać (od najprostszego 
   do najtrudniejszego)?
4. Jakie komendy/narzędzia użyć do weryfikacji każdej hipotezy?
5. Jaka jest najbardziej prawdopodobna przyczyna i dlaczego?
```

**Odpowiedź (znacznie lepsza):**
```
ANALIZA KROK PO KROKU:

1. MOŻLIWE PRZYCZYNY:
   a) Drukarka wyłączona/zawieszona
   b) Problem sieciowy (drukarka straciła łączność)
   c) Zmiana adresu IP drukarki (DHCP lease expired)
   d) Problem z serwerem wydruku (print spooler)
   e) Zmiana w konfiguracji sieci (VLAN, ACL, firewall)
   f) Awaria portu na switchu
   g) Problem ze sterownikami po aktualizacji Windows
   h) Kolejka wydruku zablokowana

2. NAJBARDZIEJ PRAWDOPODOBNE (wielu użytkowników + nagły początek):
   - Eliminuję: sterowniki (dotyczyłoby jednej osoby)
   - Eliminuję: drukarka wyłączona (zbyt oczywiste, ktoś by sprawdził)
   - Najbardziej prawdopodobne:
     * Zmiana IP drukarki (DHCP) — częsty problem
     * Problem sieciowy (port switcha, VLAN)
     * Print spooler na serwerze wydruku

3. KOLEJNOŚĆ SPRAWDZANIA:
   Krok 1: ping 192.168.1.100 (czy drukarka jest osiągalna?)
   Krok 2: Jeśli ping nie działa → sprawdź fizycznie drukarkę 
           (panel, kabel, diody)
   Krok 3: Jeśli ping działa → sprawdź print spooler na serwerze
   Krok 4: Sprawdź czy IP się nie zmieniło (arp -a, panel drukarki)
   Krok 5: Sprawdź port switcha (show interface status)

4. KOMENDY DIAGNOSTYCZNE:
   - ping 192.168.1.100
   - nslookup printer-hp-5floor (jeśli DNS)
   - Get-Service Spooler (na print server)
   - Get-Printer -Name "HP*" | Get-PrintJob (kolejka)
   - arp -a | findstr 192.168.1.100

5. NAJBARDZIEJ PRAWDOPODOBNA PRZYCZYNA:
   Zmiana adresu IP drukarki. Uzasadnienie:
   - Problem dotyczy wielu osób (wyklucza problem lokalny)
   - Pojawił się nagle (sugeruje zmianę konfiguracji)
   - Wczoraj działało (lease DHCP mógł wygasnąć w nocy)
   
   REKOMENDACJA: Przypisz drukarce stały adres IP (rezerwacja DHCP 
   lub konfiguracja statyczna) aby zapobiec powtórzeniu problemu.
```

### Wyzwalacze CoT — frazy, które aktywują rozumowanie

Dodaj do promptu jedną z tych fraz:
- „Przeanalizuj krok po kroku"
- „Pokaż swój tok rozumowania"
- „Wyjaśnij dlaczego eliminujesz poszczególne hipotezy"
- „Rozważ wszystkie możliwości zanim podasz odpowiedź"
- „Myśl jak doświadczony inżynier sieciowy"
- „Zanim odpowiesz, rozważ za i przeciw każdej opcji"

## Technika 4: Role Prompting (nadawanie roli)

### Czym jest Role Prompting

**Role prompting** to technika, w której na początku promptu definiujesz rolę, jaką AI ma przyjąć. Określasz poziom ekspertyzy, perspektywę i styl odpowiedzi.

**Dlaczego to działa:** Modele AI są trenowane na tekstach pisanych przez ludzi o różnym poziomie wiedzy. Gdy nadajesz rolę „senior network engineer z 15-letnim doświadczeniem", AI generuje odpowiedzi na poziomie eksperckim, używając odpowiedniej terminologii i głębokości analizy.

### Przykłady ról dla zadań IT

**Rola: Senior Security Engineer**
```
Jesteś senior security engineerem z 15-letnim doświadczeniem 
w zabezpieczaniu infrastruktury korporacyjnej. Specjalizujesz się 
w hardening systemów Linux i Windows, analizie podatności i incident 
response. Odpowiadasz precyzyjnie, podajesz konkretne komendy 
i odniesienia do standardów (CIS Benchmarks, NIST).

Przeanalizuj poniższą konfigurację serwera Linux pod kątem 
bezpieczeństwa...
```

**Rola: Network Architect**
```
Jesteś architektem sieciowym projektującym sieci dla operatorów 
telekomunikacyjnych. Masz doświadczenie z MPLS, Segment Routing, 
SD-WAN i sieciami 5G. Twoje odpowiedzi uwzględniają skalowalność, 
redundancję i koszty.

Zaprojektuj architekturę sieci WAN dla firmy z 20 oddziałami...
```

**Rola: DevOps Engineer**
```
Jesteś DevOps engineerem specjalizującym się w CI/CD, Kubernetes 
i Infrastructure as Code. Preferujesz rozwiązania oparte na 
Terraform, Ansible i GitOps. Twoje odpowiedzi zawierają kod 
gotowy do użycia.

Stwórz pipeline CI/CD dla aplikacji Node.js deployowanej na K8s...
```

### Łączenie roli z innymi technikami

Najlepsze rezultaty daje połączenie role prompting z innymi technikami:

```
[ROLA]
Jesteś senior Linux administratorem z certyfikatami RHCE i CKA.

[KONTEKST]
Zarządzam klastrem 50 serwerów CentOS 8 w środowisku produkcyjnym.

[ZADANIE - z Chain-of-Thought]
Jeden z serwerów (srv-prod-12) ma load average 45 przy 8 rdzeniach CPU.
Przeanalizuj krok po kroku możliwe przyczyny i zaproponuj diagnostykę.

[FORMAT]
Odpowiedz w formie:
1. Hipotezy (od najbardziej do najmniej prawdopodobnej)
2. Komendy diagnostyczne dla każdej hipotezy
3. Prawdopodobne rozwiązanie
4. Działania zapobiegawcze
```

## Technika 5: Constraining (ograniczanie odpowiedzi)

### Czym jest Constraining

**Constraining** to technika polegająca na narzuceniu AI konkretnych ograniczeń dotyczących formatu, długości, stylu lub zawartości odpowiedzi. Zamiast pozwalać AI odpowiadać „jak chce", definiujesz dokładne ramy.

### Przykłady constraintów dla IT

**Ograniczenie formatu:**
```
Odpowiedz WYŁĄCZNIE w formacie JSON. Nie dodawaj żadnego tekstu 
przed ani po JSON. Struktura:
{
  "problem": "opis problemu",
  "severity": "critical|high|medium|low",
  "solution": "kroki naprawcze",
  "commands": ["komenda1", "komenda2"]
}
```

**Ograniczenie długości:**
```
Wyjaśnij czym jest Kubernetes w MAKSYMALNIE 3 zdaniach. 
Każde zdanie max 20 słów. Język: polski, poziom: początkujący.
```

**Ograniczenie technologiczne:**
```
Napisz skrypt automatyzacji WYŁĄCZNIE w PowerShell 5.1 
(nie używaj PowerShell 7+ features). Nie używaj modułów 
zewnętrznych — tylko wbudowane cmdlety Windows Server 2019.
```

**Ograniczenie bezpieczeństwa:**
```
Wygeneruj konfigurację, która:
- NIE używa protokołów nieszyfrowanych (telnet, HTTP, FTP)
- NIE zawiera haseł w plaintext
- NIE otwiera portów, które nie są wymagane
- WYMAGA uwierzytelniania dla każdego dostępu administracyjnego
```

### Dlaczego constraining jest ważny w IT

1. **Kompatybilność** — ograniczasz do wersji/technologii, które masz w środowisku
2. **Bezpieczeństwo** — wymuszasz bezpieczne wzorce
3. **Integracja** — format odpowiedzi pasuje do Twoich narzędzi (JSON, YAML, CSV)
4. **Standaryzacja** — odpowiedzi są spójne i przewidywalne

## Praktyczny przykład 1: Kompletny szablon promptu dla zadań IT

### Struktura CRISP — szablon uniwersalny

Opracowałem szablon **CRISP** (Context, Role, Instructions, Specifics, Presentation), który sprawdza się w większości zadań IT:

```
[C - CONTEXT] Kontekst sytuacji
Opisz środowisko, problem, ograniczenia.

[R - ROLE] Rola AI
Kim ma być AI w tej interakcji.

[I - INSTRUCTIONS] Instrukcje
Co dokładnie AI ma zrobić (krok po kroku).

[S - SPECIFICS] Szczegóły techniczne
Wersje, platformy, ograniczenia, wymagania.

[P - PRESENTATION] Format prezentacji
Jak ma wyglądać odpowiedź (format, długość, styl).
```

### Przykład zastosowania CRISP

**Zadanie:** Potrzebujesz skryptu do automatycznego backupu baz danych.

```
[CONTEXT]
Zarządzam 5 serwerami PostgreSQL (wersja 15) w środowisku 
produkcyjnym. Bazy mają łącznie 500GB danych. Backup musi 
być wykonywany codziennie o 2:00 w nocy. Obecny backup 
(pg_dump do pliku) trwa 4 godziny i zajmuje za dużo miejsca.

[ROLE]
Jesteś senior DBA z doświadczeniem w PostgreSQL i automatyzacji 
backupów w środowiskach enterprise.

[INSTRUCTIONS]
1. Zaproponuj optymalną strategię backupu dla mojego środowiska
2. Napisz skrypt Bash implementujący tę strategię
3. Uwzględnij: kompresję, rotację (zachowaj 7 dni + 4 tygodnie + 
   12 miesięcy), weryfikację integralności, powiadomienia o błędach
4. Dodaj monitoring czasu trwania backupu
5. Zaproponuj plan testowania restore

[SPECIFICS]
- OS: Ubuntu 22.04 LTS
- PostgreSQL 15.4
- Storage: NFS mount /backup (10TB dostępne)
- Sieć: 10 Gbps między serwerami
- Nie mogę używać pg_basebackup (brak slotów replikacji)
- Muszę zachować kompatybilność z pg_restore
- Budżet na narzędzia: 0 (tylko open source)

[PRESENTATION]
- Skrypt z komentarzami po polsku
- Sekcja konfiguracyjna na górze (łatwa do edycji)
- Obsługa błędów z logowaniem do pliku
- Instrukcja instalacji i konfiguracji crona
- Tabela porównawcza: obecne rozwiązanie vs. proponowane
```

### Praktyczny przykład 2: Iteracyjne doskonalenie promptu

**Scenariusz:** Chcesz, aby AI pomogło Ci napisać procedurę disaster recovery. Pokażemy jak iteracyjnie ulepszać prompt.

**Iteracja 1 — zbyt ogólny prompt:**
```
Napisz procedurę disaster recovery.
```

**Problem:** Odpowiedź będzie generyczna, nie uwzględni Twojego środowiska.

**Iteracja 2 — dodajemy kontekst:**
```
Napisz procedurę disaster recovery dla środowiska:
- 3 serwery aplikacyjne (Windows Server 2022, IIS, .NET 8)
- 2 serwery bazodanowe (SQL Server 2022, Always On AG)
- 1 serwer plików (Windows, DFS)
- Firewall Palo Alto PA-3220
- Backup: Veeam Backup & Replication 12
- RPO: 1 godzina, RTO: 4 godziny
```

**Problem:** Lepiej, ale brak struktury i priorytetów.

**Iteracja 3 — dodajemy strukturę i wymagania:**
```
Napisz procedurę disaster recovery dla poniższego środowiska.

ŚRODOWISKO:
- 3 serwery aplikacyjne (Windows Server 2022, IIS, .NET 8)
- 2 serwery bazodanowe (SQL Server 2022, Always On AG)
- 1 serwer plików (Windows, DFS)
- Firewall Palo Alto PA-3220
- Backup: Veeam Backup & Replication 12
- RPO: 1 godzina, RTO: 4 godziny
- Lokalizacja DR: drugi data center (50km), połączenie 10Gbps

WYMAGANIA PROCEDURY:
1. Scenariusze: utrata jednego serwera, utrata całego DC, 
   atak ransomware
2. Dla każdego scenariusza: kroki odtwarzania w kolejności
3. Osoby odpowiedzialne (role, nie nazwiska)
4. Kryteria decyzji o uruchomieniu DR
5. Procedura powrotu do normalnej pracy (failback)
6. Checklist weryfikacji po odtworzeniu

FORMAT:
- Dokument w Markdown
- Tabele z czasami (krok, czas trwania, osoba odpowiedzialna)
- Diagramy przepływu (w formacie Mermaid)
- Sekcja "Lessons Learned" do wypełnienia po każdym teście DR
```

**Iteracja 4 — dodajemy ograniczenia i kontekst organizacyjny:**
```
[Wszystko z iteracji 3, plus:]

OGRANICZENIA:
- Zespół IT: 4 osoby (1 admin Windows, 1 admin sieci, 
  1 DBA, 1 helpdesk)
- Procedura musi być wykonalna przez JEDNĄ osobę w nocy 
  (on-call) dla scenariusza utraty jednego serwera
- Język: polski
- Zgodność z ISO 22301 (Business Continuity)
- Procedura będzie drukowana — max 15 stron A4

DODATKOWE INSTRUKCJE:
- Użyj prostego języka (procedurę może czytać osoba 
  pod presją czasu)
- Każdy krok musi mieć komendę/akcję do wykonania 
  (nie ogólniki)
- Dodaj sekcję "Czego NIE robić" (częste błędy)
- Uwzględnij komunikację (kogo powiadomić, kiedy, jak)
```

**Lekcja:** Każda iteracja dodaje wartość. Nie musisz od razu pisać idealnego promptu — możesz go rozbudowywać w kolejnych wiadomościach.

## Zaawansowane techniki

### System Prompts i Custom Instructions

Wiele narzędzi AI (ChatGPT, Claude) pozwala ustawić **Custom Instructions** lub **System Prompt** — stałe instrukcje, które AI uwzględnia w KAŻDEJ rozmowie. To idealne miejsce na:

```
CUSTOM INSTRUCTIONS DLA ADMINISTRATORA IT:

Jestem administratorem systemów w firmie telekomunikacyjnej (200 osób).
Moje środowisko:
- Windows Server 2022 (AD, Exchange Online, SCCM)
- Linux (Ubuntu 22.04, CentOS 8)
- Cisco networking (Catalyst 9000, ISR 4000, ASA)
- VMware vSphere 8
- Azure (hybrid, Azure AD Connect)
- Monitoring: Zabbix 6.4

Preferencje odpowiedzi:
- Język: polski
- Podawaj konkretne komendy, nie ogólniki
- Zawsze uwzględniaj obsługę błędów w skryptach
- Preferuję PowerShell dla Windows, Bash dla Linux
- Zawsze ostrzegaj przed komendami destrukcyjnymi
- Podawaj wersje narzędzi/modułów jeśli to istotne
- Format: krótkie wyjaśnienie + kod/komendy + weryfikacja
```

### Prompt Chaining (łańcuchowanie promptów)

**Prompt chaining** to technika dzielenia złożonego zadania na serię mniejszych promptów, gdzie wynik jednego staje się wejściem dla następnego.

**Przykład — tworzenie polityki bezpieczeństwa:**

**Prompt 1:** „Wymień 10 najważniejszych obszarów polityki bezpieczeństwa IT dla firmy telekomunikacyjnej"

**Prompt 2:** „Dla obszaru #3 (zarządzanie hasłami) napisz szczegółową politykę z wymaganiami technicznymi"

**Prompt 3:** „Na podstawie tej polityki wygeneruj konfigurację GPO (Group Policy) w PowerShell"

**Prompt 4:** „Napisz skrypt audytowy sprawdzający zgodność z tą polityką"

### Negative Prompting (czego NIE robić)

Czasem łatwiej powiedzieć AI czego NIE chcesz:

```
Napisz skrypt monitoringu serwera. 

NIE UŻYWAJ:
- Zewnętrznych modułów (tylko wbudowane cmdlety)
- Write-Host (użyj Write-Output dla pipeline)
- Hardkodowanych ścieżek (parametryzuj)
- Invoke-WebRequest bez timeout
- Credentials w plaintext

NIE GENERUJ:
- Komentarzy oczywistych ("# pobierz datę" przed Get-Date)
- Bloków try/catch bez konkretnej obsługi błędu
- Kodu, który wymaga uprawnień administratora bez sprawdzenia
```

## Najczęstsze błędy w prompt engineeringu

### Błąd 1: Zbyt ogólny prompt

**Źle:**
```
Pomóż mi z siecią.
```

**Dobrze:**
```
Mam problem z tunelem IPsec VPN między Cisco ASA (centrala) 
a FortiGate (oddział). Phase 1 zestawia się poprawnie, ale 
Phase 2 nie negocjuje. Poniżej output "show crypto ipsec sa"...
```

**Dlaczego:** AI nie czyta w myślach. Im więcej kontekstu podasz, tym trafniejsza odpowiedź.

### Błąd 2: Brak specyfikacji środowiska

**Źle:**
```
Napisz skrypt do backupu bazy danych.
```

**Dobrze:**
```
Napisz skrypt Bash do backupu bazy PostgreSQL 15 na Ubuntu 22.04.
Baza: 50GB, backup na NFS /mnt/backup, kompresja gzip, 
retencja 30 dni, powiadomienie e-mail po zakończeniu.
```

**Dlaczego:** „Skrypt do backupu" może oznaczać pg_dump, mysqldump, mongodump, RMAN, czy Veeam. Bez kontekstu AI zgaduje.

### Błąd 3: Pytanie o wiele rzeczy naraz

**Źle:**
```
Skonfiguruj mi serwer Linux z Apache, PHP, MySQL, SSL, firewall, 
monitoring, backup, hardening i CI/CD pipeline.
```

**Dobrze:**
```
Krok 1: Skonfiguruj Apache 2.4 z PHP 8.2 na Ubuntu 22.04.
Wymagania: mod_rewrite, mod_ssl, PHP-FPM (nie mod_php), 
opcache włączony, upload_max_filesize=50M.
```

**Dlaczego:** Zbyt wiele zadań w jednym prompcie prowadzi do powierzchownych odpowiedzi. Lepiej podzielić na kroki.

### Błąd 4: Brak weryfikacji odpowiedzi

**Problem:** Przyjmowanie odpowiedzi AI bez sprawdzenia.

**Rozwiązanie:** Zawsze weryfikuj:
- Czy komendy/cmdlety istnieją w Twojej wersji systemu
- Czy ścieżki i nazwy usług są poprawne
- Czy skrypt nie zawiera komend destrukcyjnych
- Czy konfiguracja jest bezpieczna (nie otwiera niepotrzebnych portów)

**Prompt weryfikacyjny:**
```
Sprawdź poniższy skrypt pod kątem:
1. Błędów składniowych
2. Problemów bezpieczeństwa
3. Kompatybilności z [wersja systemu]
4. Edge cases, które mogą powodować błędy
5. Czy wszystkie użyte cmdlety/komendy istnieją

[wklej skrypt]
```

### Błąd 5: Ignorowanie kontekstu konwersacji

**Problem:** Każda nowa wiadomość traktowana jak osobna rozmowa.

**Rozwiązanie:** Wykorzystuj kontekst konwersacji:
```
Wracając do skryptu backupu z mojej poprzedniej wiadomości — 
dodaj do niego:
1. Sprawdzanie wolnego miejsca przed backupem
2. Kompresję równoległą (pigz zamiast gzip)
3. Weryfikację integralności po zakończeniu
```

### Błąd 6: Brak określenia poziomu szczegółowości

**Źle:**
```
Wyjaśnij DNS.
```

**Dobrze (dla początkującego):**
```
Wyjaśnij jak działa DNS. Zakładaj, że wiem co to adres IP, 
ale nie znam mechanizmu tłumaczenia nazw. Użyj analogii 
do książki telefonicznej. Max 200 słów.
```

**Dobrze (dla zaawansowanego):**
```
Wyjaśnij proces DNS resolution z uwzględnieniem: recursive vs 
iterative queries, cache TTL, DNSSEC validation chain, 
DNS-over-HTTPS vs DNS-over-TLS. Podaj output dig z każdego etapu.
```

## Szablony promptów dla typowych zadań IT

### Szablon: Troubleshooting

```
PROBLEM: [opis symptomu — co nie działa]
ŚRODOWISKO: [OS, wersje, topologia]
KIEDY WYSTĄPIŁ: [data/godzina, co się zmieniło]
KOGO DOTYCZY: [jeden user / wielu / wszyscy]
CO JUŻ SPRAWDZIŁEM: [dotychczasowe kroki diagnostyczne]
DANE DIAGNOSTYCZNE: [logi, output komend, screenshoty]

PYTANIA:
1. Co jest najbardziej prawdopodobną przyczyną?
2. Jakie dodatkowe dane powinienem zebrać?
3. Jakie kroki naprawcze wykonać (w kolejności)?
4. Jak zweryfikować że naprawa zadziałała?
5. Jak zapobiec powtórzeniu problemu?
```

### Szablon: Generowanie skryptu

```
CEL: [co skrypt ma robić]
ŚRODOWISKO: [OS, wersja, zainstalowane moduły]
JĘZYK: [PowerShell/Bash/Python]
WEJŚCIE: [skąd bierze dane — plik, parametry, API]
WYJŚCIE: [co produkuje — raport, plik, e-mail, log]
HARMONOGRAM: [jak często uruchamiany — cron, Task Scheduler]
OBSŁUGA BŁĘDÓW: [co robić gdy coś pójdzie nie tak]
OGRANICZENIA: [czego nie używać, limity zasobów]
KONWENCJE: [nazewnictwo, ścieżki, standardy firmy]
```

### Szablon: Analiza bezpieczeństwa

```
OBIEKT ANALIZY: [konfiguracja/kod/architektura]
STANDARD ODNIESIENIA: [CIS Benchmark/NIST/ISO 27001/PCI DSS]
ŚRODOWISKO: [produkcja/test/dev]
POZIOM RYZYKA: [co chronimy — dane osobowe/finansowe/publiczne]
WYMAGANY FORMAT: [raport/checklist/komendy naprawcze]

PYTANIA:
1. Jakie podatności/słabości widzisz?
2. Jaki jest poziom ryzyka (krytyczny/wysoki/średni/niski)?
3. Jakie są konkretne kroki naprawcze?
4. Co powinienem monitorować po naprawie?
```

### Szablon: Planowanie zmiany

```
ZMIANA: [co chcę zmienić]
OBECNY STAN: [jak jest teraz]
DOCELOWY STAN: [jak ma być po zmianie]
ŚRODOWISKO: [produkcja/test, godziny pracy, okno serwisowe]
ZALEŻNOŚCI: [co może być dotknięte zmianą]
RYZYKO: [co może pójść nie tak]

POTRZEBUJĘ:
1. Plan implementacji (krok po kroku z czasami)
2. Plan testowania (jak zweryfikować sukces)
3. Plan rollback (jak cofnąć jeśli nie zadziała)
4. Komunikacja (kogo powiadomić, kiedy)
5. Checklist pre-change i post-change
```

## Zaawansowane zastosowania w codziennej pracy IT

### Tworzenie dokumentacji z AI

```
Na podstawie poniższego skryptu PowerShell wygeneruj:
1. Dokumentację techniczną (co robi, jak działa, zależności)
2. Instrukcję użytkowania (dla operatora L1)
3. Sekcję FAQ (5 najczęstszych pytań)
4. Changelog template

Format: Markdown, język: polski
Poziom szczegółowości: wystarczający aby nowa osoba w zespole 
mogła uruchomić i zmodyfikować skrypt.

[wklej skrypt]
```

### Konwersja między technologiami

```
Skonwertuj poniższy skrypt z Bash na PowerShell. Zachowaj:
- Tę samą logikę i funkcjonalność
- Obsługę błędów (zamień set -e na try/catch)
- Komentarze (przetłumacz na polski)
- Parametryzację (zamień zmienne env na parametry skryptu)

Dodaj:
- Walidację parametrów wejściowych
- Verbose output (Write-Verbose)
- Wsparcie dla -WhatIf

[wklej skrypt Bash]
```

### Generowanie testów

```
Na podstawie poniższej funkcji PowerShell wygeneruj testy Pester:
1. Happy path (normalne działanie)
2. Edge cases (puste dane, null, za duże wartości)
3. Error cases (brak pliku, brak uprawnień, timeout)
4. Mock external dependencies (sieć, baza danych)

Użyj Pester v5 syntax (Describe/Context/It/Should).
Każdy test z opisem po polsku co weryfikuje.

[wklej funkcję]
```

## Podsumowanie rozdziału

Prompt engineering to umiejętność, która rozwija się z praktyką. Nie ma jednego „idealnego" promptu — najlepszy prompt to taki, który daje Ci dokładnie to, czego potrzebujesz w danym momencie.

Kluczowe wnioski:

1. **Zero-shot** wystarcza do prostych pytań, ale złożone zadania wymagają więcej kontekstu
2. **Few-shot** jest potężny gdy potrzebujesz konkretnego formatu lub konwencji
3. **Chain-of-Thought** wymusza systematyczne rozumowanie — niezbędne w troubleshootingu
4. **Role prompting** podnosi poziom ekspercki odpowiedzi
5. **Constraining** zapewnia bezpieczeństwo i kompatybilność
6. **Iteracja jest naturalna** — nie musisz pisać idealnego promptu za pierwszym razem
7. **Szablony oszczędzają czas** — opracuj swoje wzorce dla powtarzalnych zadań
8. **Weryfikacja jest obowiązkowa** — AI może się mylić, szczególnie w szczegółach technicznych

**Złota zasada:** Traktuj AI jak bardzo zdolnego, ale niedoświadczonego stażystę. Ma ogromną wiedzę teoretyczną, ale nie zna Twojego środowiska, Twoich konwencji i Twoich ograniczeń. Im lepiej mu to opiszesz, tym lepsze wyniki otrzymasz.

W następnym rozdziale pokażemy jak wykorzystać AI do tworzenia i utrzymywania dokumentacji technicznej — jednego z najbardziej zaniedbywanych, a jednocześnie najważniejszych aspektów pracy w IT.
