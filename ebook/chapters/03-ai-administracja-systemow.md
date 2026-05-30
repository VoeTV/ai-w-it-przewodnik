# Rozdział 3: AI w Administracji Systemami

## Wprowadzenie

Administracja systemami to dziedzina, w której sztuczna inteligencja może być prawdziwym game-changerem. Codzienne zadania administratora — pisanie skryptów automatyzacji, analiza logów, monitorowanie wydajności, rozwiązywanie problemów — to obszary, w których AI oferuje natychmiastową wartość.

W tym rozdziale pokażemy konkretne zastosowania AI w trzech kluczowych obszarach pracy administratora systemów:
1. **Tworzenie skryptów** — PowerShell, Bash, Python
2. **Monitoring i analiza alertów** — interpretacja danych, identyfikacja wzorców
3. **Troubleshooting** — diagnostyka problemów, analiza logów, znajdowanie przyczyn

Każdy przykład jest gotowy do użycia — wystarczy dostosować do swojego środowiska.

## AI w tworzeniu skryptów

### Dlaczego AI zmienia podejście do skryptowania

Tradycyjnie, napisanie skryptu automatyzacji wymagało:
- Znajomości składni języka (PowerShell, Bash, Python)
- Przeszukiwania dokumentacji i Stack Overflow
- Testowania i debugowania
- Obsługi błędów i edge case'ów

Z AI ten proces wygląda inaczej:
1. Opisujesz co skrypt ma robić w języku naturalnym
2. AI generuje kod
3. Weryfikujesz i testujesz
4. Prosisz AI o poprawki lub rozszerzenia

**Kluczowa zmiana:** Nie musisz pamiętać składni. Musisz wiedzieć, CO chcesz osiągnąć i umieć ZWERYFIKOWAĆ, czy wygenerowany kod jest poprawny.

### Praktyczny przykład 1: Skrypt audytu kont Active Directory

**Scenariusz:** Potrzebujesz skryptu, który znajdzie nieaktywne konta w Active Directory — konta, na które nikt nie logował się od ponad 90 dni. Taki audyt jest wymagany przez politykę bezpieczeństwa firmy.

**Prompt:**

```
Napisz skrypt PowerShell, który wykonuje audyt nieaktywnych kont 
w Active Directory. Wymagania:

1. Znajdź wszystkie konta użytkowników, na które nikt nie logował się 
   od ponad 90 dni
2. Wyklucz konta serwisowe (zaczynające się od "svc_" lub "srv_")
3. Wyklucz konta w OU "Disabled Users"
4. Dla każdego znalezionego konta zbierz:
   - Nazwa wyświetlana (DisplayName)
   - Login (SamAccountName)
   - Data ostatniego logowania
   - Dział (Department)
   - Manager
   - Czy konto jest włączone
5. Wyeksportuj wyniki do pliku CSV z datą w nazwie
6. Wyślij podsumowanie e-mailem do administratora
7. Dodaj obsługę błędów i logowanie do pliku
8. Dodaj komentarze wyjaśniające każdą sekcję

Środowisko: Windows Server 2022, moduł ActiveDirectory zainstalowany.
Ścieżka logów: C:\Scripts\Logs\
Ścieżka raportów: C:\Scripts\Reports\
E-mail administratora: admin@firma.pl
Serwer SMTP: smtp.firma.pl
```

**Wygenerowany skrypt (fragment):**

```powershell
#Requires -Modules ActiveDirectory

<#
.SYNOPSIS
    Audyt nieaktywnych kont Active Directory
.DESCRIPTION
    Skrypt identyfikuje konta użytkowników bez logowania od 90+ dni,
    generuje raport CSV i wysyła podsumowanie e-mailem.
.NOTES
    Autor: Wygenerowano z pomocą AI, zweryfikowano przez [Twoje imię]
    Data: [data utworzenia]
    Wersja: 1.0
#>

# === KONFIGURACJA ===
$DaysInactive = 90
$ExcludedOUs = @("OU=Disabled Users,DC=firma,DC=local")
$ServiceAccountPrefixes = @("svc_", "srv_")
$ReportPath = "C:\Scripts\Reports"
$LogPath = "C:\Scripts\Logs"
$AdminEmail = "admin@firma.pl"
$SmtpServer = "smtp.firma.pl"

# === INICJALIZACJA ===
$Date = Get-Date -Format "yyyy-MM-dd"
$LogFile = Join-Path $LogPath "AD-Audit-$Date.log"
$ReportFile = Join-Path $ReportPath "Inactive-Accounts-$Date.csv"

# Funkcja logowania
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $LogEntry
    if ($Level -eq "ERROR") { Write-Warning $Message }
    else { Write-Host $Message }
}

try {
    Write-Log "Rozpoczęcie audytu nieaktywnych kont AD"
    
    # Oblicz datę graniczną
    $CutoffDate = (Get-Date).AddDays(-$DaysInactive)
    Write-Log "Data graniczna: $CutoffDate (konta nieaktywne od $DaysInactive dni)"
    
    # Pobierz wszystkie konta użytkowników z ostatnim logowaniem przed datą graniczną
    $InactiveAccounts = Get-ADUser -Filter {
        LastLogonTimestamp -lt $CutoffDate -and 
        Enabled -eq $true
    } -Properties LastLogonTimestamp, DisplayName, Department, Manager, 
                 DistinguishedName, SamAccountName |
    Where-Object {
        # Wyklucz konta serwisowe
        $dominated = $false
        foreach ($prefix in $ServiceAccountPrefixes) {
            if ($_.SamAccountName.StartsWith($prefix)) { 
                $dominated = $true; break 
            }
        }
        -not $dominated
    } |
    Where-Object {
        # Wyklucz konta w wykluczonych OU
        $dominated = $false
        foreach ($ou in $ExcludedOUs) {
            if ($_.DistinguishedName -like "*$ou*") { 
                $dominated = $true; break 
            }
        }
        -not $dominated
    }
    
    Write-Log "Znaleziono $($InactiveAccounts.Count) nieaktywnych kont"
    
    # Przygotuj dane do raportu
    $Report = $InactiveAccounts | Select-Object @{
        Name='DisplayName'; Expression={$_.DisplayName}
    }, @{
        Name='SamAccountName'; Expression={$_.SamAccountName}
    }, @{
        Name='LastLogon'; Expression={
            [DateTime]::FromFileTime($_.LastLogonTimestamp).ToString("yyyy-MM-dd")
        }
    }, @{
        Name='Department'; Expression={$_.Department}
    }, @{
        Name='Manager'; Expression={
            if ($_.Manager) { (Get-ADUser $_.Manager).Name } else { "Brak" }
        }
    }, @{
        Name='DaysInactive'; Expression={
            ((Get-Date) - [DateTime]::FromFileTime($_.LastLogonTimestamp)).Days
        }
    }
    
    # Eksport do CSV
    $Report | Export-Csv -Path $ReportFile -NoTypeInformation -Encoding UTF8
    Write-Log "Raport zapisany: $ReportFile"
    
    # Wyślij e-mail z podsumowaniem
    $EmailBody = @"
Audyt nieaktywnych kont Active Directory - $Date

Znaleziono $($InactiveAccounts.Count) kont bez logowania od $DaysInactive dni.

Top 5 działów z największą liczbą nieaktywnych kont:
$($Report | Group-Object Department | Sort-Object Count -Descending | 
  Select-Object -First 5 | ForEach-Object { "- $($_.Name): $($_.Count) kont" } | 
  Out-String)

Raport CSV w załączniku.

Rekomendacja: Konta nieaktywne powyżej 180 dni powinny zostać wyłączone.
"@
    
    Send-MailMessage -From "ad-audit@firma.pl" -To $AdminEmail `
        -Subject "Audyt AD: $($InactiveAccounts.Count) nieaktywnych kont" `
        -Body $EmailBody -SmtpServer $SmtpServer `
        -Attachments $ReportFile -Encoding UTF8
    
    Write-Log "E-mail wysłany do $AdminEmail"
    Write-Log "Audyt zakończony pomyślnie"
}
catch {
    Write-Log "BŁĄD: $($_.Exception.Message)" -Level "ERROR"
    Write-Log "Stack trace: $($_.ScriptStackTrace)" -Level "ERROR"
    
    # Powiadom administratora o błędzie
    Send-MailMessage -From "ad-audit@firma.pl" -To $AdminEmail `
        -Subject "BŁĄD: Audyt AD nieudany - $Date" `
        -Body "Skrypt audytu AD zakończył się błędem:`n$($_.Exception.Message)" `
        -SmtpServer $SmtpServer
}
```

**Co zyskujesz:**
- Gotowy skrypt w 2 minuty zamiast 1-2 godzin ręcznego pisania
- Obsługa błędów, logowanie, raportowanie — elementy, które często pomijamy „bo nie ma czasu"
- Komentarze i dokumentacja wbudowane w kod
- Łatwa modyfikacja — możesz poprosić AI o dodanie funkcji (np. automatyczne wyłączanie kont po 180 dniach)

**Jak zweryfikować skrypt:**
1. Przeczytaj kod linia po linii — czy rozumiesz co robi?
2. Sprawdź nazwy cmdletów w dokumentacji Microsoft (Get-ADUser, Send-MailMessage)
3. Uruchom najpierw z parametrem `-WhatIf` lub na testowym OU
4. Sprawdź czy ścieżki i nazwy serwerów są poprawne dla Twojego środowiska

### Praktyczny przykład 2: Skrypt monitorowania przestrzeni dyskowej z alertami

**Scenariusz:** Potrzebujesz skryptu Bash, który monitoruje użycie dysków na serwerach Linux i wysyła alerty, gdy przestrzeń się kończy.

**Prompt:**

```
Napisz skrypt Bash do monitorowania przestrzeni dyskowej na serwerze 
Linux (Ubuntu 22.04). Wymagania:

1. Sprawdź użycie wszystkich zamontowanych systemów plików
2. Ignoruj systemy plików: tmpfs, devtmpfs, squashfs
3. Progi alertów:
   - WARNING: użycie > 80%
   - CRITICAL: użycie > 90%
4. Dla każdego przekroczonego progu:
   - Wyślij e-mail do admina
   - Zapisz do syslog
   - Znajdź 10 największych plików/katalogów w danym systemie plików
5. Generuj raport HTML z tabelą wszystkich systemów plików
6. Skrypt będzie uruchamiany z crona co godzinę
7. Dodaj obsługę pliku konfiguracyjnego (progi, e-mail, wykluczenia)
8. Dodaj lockfile, aby zapobiec równoległemu uruchomieniu

Dodaj komentarze po polsku wyjaśniające logikę.
```

**Wygenerowany skrypt:**

```bash
#!/bin/bash
#
# Monitor przestrzeni dyskowej z alertami
# Uruchamiany z crona co godzinę
# Autor: Wygenerowano z AI, zweryfikowano przez [admin]
#

# === KONFIGURACJA ===
CONFIG_FILE="/etc/disk-monitor/config.conf"
LOCK_FILE="/var/run/disk-monitor.lock"
LOG_TAG="disk-monitor"
REPORT_DIR="/var/log/disk-monitor"

# Domyślne wartości (nadpisywane przez config)
WARNING_THRESHOLD=80
CRITICAL_THRESHOLD=90
ADMIN_EMAIL="admin@firma.pl"
EXCLUDED_FS="tmpfs|devtmpfs|squashfs|overlay"
SMTP_SERVER="localhost"

# === FUNKCJE ===

# Logowanie do syslog i konsoli
log_message() {
    local level="$1"
    local message="$2"
    logger -t "$LOG_TAG" -p "local0.$level" "$message"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message"
}

# Wczytaj konfigurację z pliku
load_config() {
    if [[ -f "$CONFIG_FILE" ]]; then
        source "$CONFIG_FILE"
        log_message "info" "Konfiguracja wczytana z $CONFIG_FILE"
    else
        log_message "warning" "Brak pliku konfiguracyjnego, używam wartości domyślnych"
    fi
}

# Sprawdź i ustaw lockfile (zapobiega równoległemu uruchomieniu)
acquire_lock() {
    if [[ -f "$LOCK_FILE" ]]; then
        local pid=$(cat "$LOCK_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log_message "warning" "Skrypt już działa (PID: $pid), kończę"
            exit 0
        else
            log_message "info" "Usuwam nieaktualny lockfile (PID: $pid)"
            rm -f "$LOCK_FILE"
        fi
    fi
    echo $$ > "$LOCK_FILE"
}

# Zwolnij lockfile
release_lock() {
    rm -f "$LOCK_FILE"
}

# Znajdź największe pliki w danym punkcie montowania
find_largest_files() {
    local mount_point="$1"
    local count="${2:-10}"
    
    du -ah "$mount_point" 2>/dev/null | \
        sort -rh | \
        head -n "$count" | \
        awk '{printf "  %s\t%s\n", $1, $2}'
}

# Wyślij alert e-mailem
send_alert() {
    local level="$1"
    local filesystem="$2"
    local usage="$3"
    local mount_point="$4"
    local largest_files="$5"
    
    local subject="[$level] Dysk $mount_point - użycie ${usage}% na $(hostname)"
    local body="ALERT: Przestrzeń dyskowa
    
Serwer: $(hostname)
System plików: $filesystem
Punkt montowania: $mount_point
Użycie: ${usage}%
Próg: ${level} (WARNING=${WARNING_THRESHOLD}%, CRITICAL=${CRITICAL_THRESHOLD}%)
Data: $(date '+%Y-%m-%d %H:%M:%S')

10 największych elementów:
$largest_files

---
Wygenerowano automatycznie przez disk-monitor"

    echo "$body" | mail -s "$subject" "$ADMIN_EMAIL"
    log_message "info" "Alert wysłany do $ADMIN_EMAIL: $subject"
}

# Generuj raport HTML
generate_html_report() {
    local report_file="$REPORT_DIR/disk-report-$(date '+%Y%m%d-%H%M').html"
    
    cat > "$report_file" << 'HEADER'
<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Raport przestrzeni dyskowej</title>
<style>
body { font-family: Arial, sans-serif; margin: 20px; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
th { background-color: #4CAF50; color: white; }
.warning { background-color: #fff3cd; }
.critical { background-color: #f8d7da; }
.ok { background-color: #d4edda; }
</style></head><body>
HEADER

    echo "<h1>Raport przestrzeni dyskowej - $(hostname)</h1>" >> "$report_file"
    echo "<p>Data: $(date '+%Y-%m-%d %H:%M:%S')</p>" >> "$report_file"
    echo "<table><tr><th>System plików</th><th>Rozmiar</th><th>Użyte</th>" >> "$report_file"
    echo "<th>Dostępne</th><th>Użycie %</th><th>Punkt montowania</th><th>Status</th></tr>" >> "$report_file"
    
    df -h --output=source,size,used,avail,pcent,target | \
    grep -vE "^(Filesystem|${EXCLUDED_FS})" | \
    while read fs size used avail pcent mount; do
        local usage=${pcent%\%}
        local css_class="ok"
        local status="OK"
        
        if [[ $usage -ge $CRITICAL_THRESHOLD ]]; then
            css_class="critical"
            status="KRYTYCZNY"
        elif [[ $usage -ge $WARNING_THRESHOLD ]]; then
            css_class="warning"
            status="OSTRZEŻENIE"
        fi
        
        echo "<tr class='$css_class'><td>$fs</td><td>$size</td><td>$used</td>" >> "$report_file"
        echo "<td>$avail</td><td>${usage}%</td><td>$mount</td><td>$status</td></tr>" >> "$report_file"
    done
    
    echo "</table></body></html>" >> "$report_file"
    log_message "info" "Raport HTML: $report_file"
}

# === GŁÓWNA LOGIKA ===

# Obsługa sygnałów (cleanup)
trap release_lock EXIT

# Inicjalizacja
load_config
acquire_lock
mkdir -p "$REPORT_DIR"

log_message "info" "Rozpoczęcie sprawdzania przestrzeni dyskowej"

# Sprawdź każdy system plików
alerts_sent=0

df --output=source,pcent,target | \
grep -vE "^(Filesystem|${EXCLUDED_FS})" | \
while read filesystem usage mount_point; do
    # Usuń znak % z wartości użycia
    usage_num=${usage%\%}
    
    if [[ $usage_num -ge $CRITICAL_THRESHOLD ]]; then
        log_message "crit" "CRITICAL: $mount_point użycie ${usage_num}%"
        largest=$(find_largest_files "$mount_point" 10)
        send_alert "CRITICAL" "$filesystem" "$usage_num" "$mount_point" "$largest"
        ((alerts_sent++))
        
    elif [[ $usage_num -ge $WARNING_THRESHOLD ]]; then
        log_message "warning" "WARNING: $mount_point użycie ${usage_num}%"
        largest=$(find_largest_files "$mount_point" 10)
        send_alert "WARNING" "$filesystem" "$usage_num" "$mount_point" "$largest"
        ((alerts_sent++))
    fi
done

# Generuj raport HTML
generate_html_report

log_message "info" "Sprawdzanie zakończone. Alertów: $alerts_sent"
```

**Konfiguracja crona:**
```bash
# Uruchamiaj co godzinę
0 * * * * /opt/scripts/disk-monitor.sh >> /var/log/disk-monitor/cron.log 2>&1
```

**Co zyskujesz:**
- Kompletny skrypt monitoringu z alertami, raportami HTML i obsługą błędów
- Lockfile zapobiegający problemom z równoległym uruchomieniem
- Konfigurowalność przez plik zewnętrzny
- Integracja z syslog
- Gotowy do wdrożenia po dostosowaniu ścieżek i adresów e-mail

### Wskazówki do generowania skryptów z AI

1. **Bądź precyzyjny** — podaj system operacyjny, wersję, zainstalowane moduły
2. **Określ obsługę błędów** — AI domyślnie może pominąć try/catch
3. **Wymagaj komentarzy** — ułatwi weryfikację i przyszłe modyfikacje
4. **Podaj konwencje** — nazewnictwo zmiennych, ścieżki, standardy firmy
5. **Proś o parametryzację** — hardkodowane wartości utrudniają przenoszenie między środowiskami
6. **Iteruj** — pierwszy wynik rzadko jest idealny, doprecyzuj w kolejnych wiadomościach

## AI w monitoringu i analizie alertów

### Problem z nadmiarem alertów

Współczesne systemy monitoringu (Zabbix, Nagios, Prometheus, PRTG, Datadog) generują setki alertów dziennie. Wiele z nich to:
- Fałszywe alarmy (false positives)
- Alerty o niskim priorytecie, które nie wymagają natychmiastowej reakcji
- Powtarzające się alerty z tego samego źródła
- Alerty, które są symptomem jednego większego problemu

**Alert fatigue** (zmęczenie alertami) to realne zjawisko — gdy administrator otrzymuje zbyt wiele alertów, zaczyna je ignorować, co prowadzi do przeoczenia prawdziwych problemów.

### Jak AI pomaga w analizie alertów

AI może analizować grupy alertów i:
- Identyfikować wspólną przyczynę (root cause)
- Priorytetyzować alerty według wpływu na biznes
- Sugerować, które alerty można wyciszyć lub skonsolidować
- Korelować alerty z różnych systemów

### Praktyczny przykład 3: Analiza grupy alertów

**Scenariusz:** W ciągu ostatniej godziny otrzymałeś 15 alertów z różnych systemów. Zamiast analizować każdy osobno, wklejasz je do AI.

**Prompt:**

```
Jestem administratorem systemów. W ciągu ostatniej godziny otrzymałem 
poniższe alerty z systemu monitoringu. Przeanalizuj je i:

1. Zidentyfikuj prawdopodobną przyczynę główną (root cause)
2. Pogrupuj alerty według prawdopodobnej przyczyny
3. Określ priorytet reakcji (co naprawić najpierw)
4. Zaproponuj kroki diagnostyczne
5. Zasugeruj, które alerty można wyciszyć po rozwiązaniu problemu głównego

ALERTY:
[08:15] CRITICAL - srv-db01: Disk I/O latency > 500ms (current: 1200ms)
[08:16] WARNING - srv-app01: Response time > 2s (current: 4.5s)
[08:16] WARNING - srv-app02: Response time > 2s (current: 3.8s)
[08:17] CRITICAL - srv-db01: CPU usage > 95% (current: 98%)
[08:17] WARNING - srv-app01: Connection pool exhausted (active: 200/200)
[08:18] CRITICAL - srv-db01: Slow queries detected (avg: 15s)
[08:18] WARNING - srv-app02: Connection pool exhausted (active: 200/200)
[08:19] WARNING - srv-web01: 502 Bad Gateway errors (rate: 45/min)
[08:19] WARNING - srv-web02: 502 Bad Gateway errors (rate: 38/min)
[08:20] CRITICAL - srv-db01: Replication lag > 60s (current: 120s)
[08:21] WARNING - monitoring: srv-app01 health check failed
[08:21] WARNING - monitoring: srv-app02 health check failed
[08:22] WARNING - srv-db01: Temp tablespace usage > 90%
[08:23] CRITICAL - srv-db01: Active sessions > 500 (current: 487)
[08:25] WARNING - load-balancer: Backend srv-app01 marked as DOWN
```

**Przykładowa odpowiedź AI:**

```
ANALIZA ALERTÓW — ROOT CAUSE ANALYSIS

PRAWDOPODOBNA PRZYCZYNA GŁÓWNA:
Przeciążenie serwera bazy danych (srv-db01) — prawdopodobnie 
spowodowane ciężkim zapytaniem lub procesem, który generuje 
nadmierne I/O i zużywa zasoby CPU.

GRUPOWANIE ALERTÓW:

Grupa 1 — ŹRÓDŁO PROBLEMU (srv-db01):
- Disk I/O latency 1200ms ← prawdopodobna przyczyna pierwotna
- CPU 98% ← konsekwencja wysokiego I/O
- Slow queries 15s ← konsekwencja I/O + CPU
- Temp tablespace 90% ← duże zapytanie używa temp space
- Active sessions 487 ← sesje czekają na wolne zasoby
- Replication lag 120s ← slave nie nadąża za masterem

Grupa 2 — KONSEKWENCJE (warstwa aplikacji):
- srv-app01/02 response time ← czekają na DB
- Connection pool exhausted ← wszystkie połączenia zajęte przez wolne query
- Health check failed ← aplikacje nie odpowiadają

Grupa 3 — KONSEKWENCJE (warstwa web):
- 502 Bad Gateway ← web serwery nie mogą połączyć się z app
- Load balancer marking backend DOWN ← konsekwencja 502

PRIORYTET REAKCJI:
1. [NATYCHMIAST] Zidentyfikuj i zabij problematyczne zapytanie na srv-db01
2. [5 min] Sprawdź czy connection pools się odblokują po naprawie DB
3. [10 min] Zweryfikuj czy replikacja nadrabia
4. [15 min] Potwierdź powrót do normy na warstwie web

KROKI DIAGNOSTYCZNE:
1. Na srv-db01 uruchom:
   - SELECT * FROM pg_stat_activity WHERE state = 'active' 
     ORDER BY duration DESC LIMIT 10;
   - Lub dla MySQL: SHOW FULL PROCESSLIST;
2. Zidentyfikuj zapytanie z najdłuższym czasem wykonania
3. Sprawdź czy to zaplanowany job (backup? raport? ETL?)
4. Jeśli to niezaplanowane zapytanie — zabij je (pg_terminate_backend/KILL)
5. Monitoruj powrót I/O latency do normy

ALERTY DO WYCISZENIA PO ROZWIĄZANIU:
Wszystkie alerty z Grupy 2 i 3 powinny ustąpić automatycznie 
po rozwiązaniu problemu na srv-db01. Jeśli nie ustąpią w ciągu 
5 minut — wymagają osobnej diagnostyki.
```

**Wartość:** Zamiast reagować na 15 alertów osobno (co mogłoby zająć godzinę), w 2 minuty masz jasny obraz sytuacji i plan działania.

## AI w troubleshootingu

### Analiza logów z AI

Logi systemowe to kopalnia informacji, ale ich analiza jest czasochłonna. AI może przeszukać setki linii logów i wyodrębnić istotne informacje.

**Prompt do analizy logów:**

```
Przeanalizuj poniższy fragment logu serwera aplikacji Java (Spring Boot). 
Aplikacja przestała odpowiadać o 14:32. Zidentyfikuj:

1. Pierwszą anomalię w logach (co się zaczęło psuć)
2. Sekwencję zdarzeń prowadzącą do awarii
3. Prawdopodobną przyczynę główną
4. Rekomendowane działania naprawcze
5. Rekomendacje zapobiegawcze (jak uniknąć w przyszłości)

[wklej fragment logu - 50-200 linii]
```

### Praktyczny przykład 4: Troubleshooting problemu z wydajnością serwera

**Scenariusz:** Serwer Linux nagle zaczął działać wolno. Użytkownicy zgłaszają timeouty.

**Krok 1: Zbierz dane diagnostyczne**

```bash
# Zbierz informacje o systemie do analizy
top -bn1 | head -30 > /tmp/diag-top.txt
free -h >> /tmp/diag-top.txt
df -h >> /tmp/diag-top.txt
iostat -x 1 3 >> /tmp/diag-top.txt
netstat -tlnp >> /tmp/diag-top.txt
dmesg | tail -50 >> /tmp/diag-top.txt
journalctl --since "1 hour ago" --priority=err >> /tmp/diag-top.txt
```

**Krok 2: Wklej dane do AI**

**Prompt:**

```
Jestem administratorem serwera Linux (Ubuntu 22.04, 16GB RAM, 8 vCPU). 
Serwer nagle zaczął działać wolno — użytkownicy zgłaszają timeouty 
w aplikacji webowej (Nginx + PHP-FPM + MySQL).

Poniżej dane diagnostyczne zebrane w momencie problemu. 
Przeanalizuj je i podaj:

1. Co jest przyczyną spowolnienia
2. Które procesy/zasoby są wąskim gardłem
3. Natychmiastowe działania naprawcze (co zrobić TERAZ)
4. Długoterminowe rozwiązania (jak zapobiec w przyszłości)
5. Jakie dodatkowe dane powinienem zebrać, jeśli powyższe nie wystarczą

DANE DIAGNOSTYCZNE:
---
[wklej zawartość /tmp/diag-top.txt]
---
```

**Krok 3: Wykonaj rekomendowane działania**

AI może zaproponować na przykład:
- „MySQL zużywa 12GB RAM — prawdopodobnie brak limitu innodb_buffer_pool_size"
- „OOM killer zabił proces PHP-FPM 10 minut temu — za mało RAM"
- „Swap usage 100% — system thrashuje"

**Krok 4: Poproś o konkretne komendy naprawcze**

```
Na podstawie Twojej analizy, podaj dokładne komendy, które powinienem 
wykonać aby:
1. Natychmiast odciążyć serwer (bez restartu usług jeśli możliwe)
2. Skonfigurować MySQL aby nie zużywał więcej niż 8GB RAM
3. Skonfigurować PHP-FPM aby ograniczyć liczbę procesów
4. Dodać monitoring, który ostrzeże mnie zanim problem się powtórzy
```

### Debugowanie skryptów z AI

Gdy Twój skrypt nie działa jak powinien, AI może pomóc w znalezieniu błędu:

**Prompt:**

```
Mój skrypt PowerShell nie działa poprawnie. Powinien kopiować pliki 
starsze niż 30 dni do archiwum, ale kopiuje WSZYSTKIE pliki. 
Znajdź błąd i zaproponuj poprawkę.

```powershell
$SourcePath = "D:\Dane\Projekty"
$ArchivePath = "D:\Archiwum"
$DaysOld = 30
$CutoffDate = (Get-Date).AddDays($DaysOld)  # BUG: powinno być -$DaysOld

Get-ChildItem -Path $SourcePath -Recurse -File |
Where-Object { $_.LastWriteTime -lt $CutoffDate } |
ForEach-Object {
    $destPath = $_.FullName.Replace($SourcePath, $ArchivePath)
    $destDir = Split-Path $destPath -Parent
    if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force }
    Move-Item $_.FullName $destPath
}
```
```

AI natychmiast zidentyfikuje błąd: `AddDays($DaysOld)` dodaje 30 dni do dzisiejszej daty (przyszłość), więc WSZYSTKIE pliki mają datę wcześniejszą niż ta data. Powinno być `AddDays(-$DaysOld)`.

## Automatyzacja rutynowych zadań administracyjnych

### Zadania idealne do automatyzacji z AI

| Zadanie | Częstotliwość | Czas ręczny | Czas z AI |
|---------|---------------|-------------|-----------|
| Audyt kont AD | Miesięcznie | 4h | 30 min (pierwszy raz), 5 min (kolejne) |
| Raport użycia dysków | Tygodniowo | 1h | Automatyczny (skrypt) |
| Czyszczenie logów | Tygodniowo | 30 min | Automatyczny (skrypt) |
| Sprawdzenie certyfikatów SSL | Tygodniowo | 1h | Automatyczny (skrypt) |
| Backup verification | Dziennie | 30 min | Automatyczny (skrypt) |
| Patch compliance report | Miesięcznie | 3h | 45 min |
| Onboarding nowego pracownika | Per event | 2h | 30 min |

### Workflow tworzenia automatyzacji z AI

1. **Opisz zadanie** — co robisz ręcznie, krok po kroku
2. **Poproś AI o skrypt** — z pełnym kontekstem środowiska
3. **Zweryfikuj** — przeczytaj kod, zrozum logikę
4. **Przetestuj** — na środowisku testowym lub z ograniczonym zakresem
5. **Wdróż** — dodaj do crona/Task Scheduler
6. **Monitoruj** — sprawdzaj logi, reaguj na błędy
7. **Iteruj** — proś AI o ulepszenia na podstawie doświadczeń

## AI jako „drugi administrator"

### Konsultacje techniczne

AI może służyć jako „drugi administrator", z którym konsultujesz decyzje:

```
Planuję migrację serwera plików z Windows Server 2016 na 2022. 
Obecna konfiguracja:
- 4TB danych na RAID 10 (8x 1TB SAS)
- DFS Replication do drugiej lokalizacji
- 200 użytkowników, 50 współdzielonych folderów
- Shadow Copies włączone
- Quota na folderach działowych

Zaproponuj plan migracji krok po kroku, uwzględniając:
- Minimalizację downtime (max 2h w weekend)
- Zachowanie uprawnień NTFS
- Zachowanie DFS Replication
- Plan rollback jeśli coś pójdzie nie tak
- Checklistę pre-migration i post-migration
```

### Nauka nowych technologii

Gdy musisz szybko opanować nową technologię:

```
Jestem administratorem Windows z 5-letnim doświadczeniem. 
Muszę wdrożyć Kubernetes (K8s) dla zespołu deweloperskiego. 
Nigdy nie pracowałem z kontenerami.

Stwórz plan nauki Kubernetes dla administratora Windows:
1. Co muszę wiedzieć ZANIM zacznę (prerequisites)
2. Minimalna wiedza potrzebna do wdrożenia prostego klastra
3. Krok po kroku: od instalacji po pierwszy deployment
4. Najczęstsze błędy początkujących administratorów K8s
5. Zasoby do dalszej nauki (dokumentacja, kursy, laboratoria)

Wyjaśniaj pojęcia K8s przez analogie do świata Windows Server 
(np. Pod = jak VM, Service = jak load balancer, etc.)
```

## Bezpieczeństwo przy korzystaniu z AI w administracji

### Złote zasady

1. **Nigdy nie wklejaj prawdziwych haseł, kluczy API, certyfikatów** do AI
2. **Anonimizuj adresy IP** — zamień produkcyjne IP na 10.x.x.x lub 192.168.x.x
3. **Nie wklejaj pełnych konfiguracji firewalla** — mogą ujawnić architekturę sieci
4. **Testuj skrypty AI na środowisku testowym** — nigdy bezpośrednio na produkcji
5. **Weryfikuj komendy destrukcyjne** — rm -rf, DROP TABLE, Format-Volume — AI może je zaproponować bez ostrzeżenia
6. **Nie ufaj AI w kwestiach bezpieczeństwa** — zawsze weryfikuj z oficjalną dokumentacją

### Checklist przed uruchomieniem skryptu z AI

- [ ] Przeczytałem cały kod i rozumiem co robi
- [ ] Sprawdziłem czy nie ma komend destrukcyjnych (rm, del, drop, format)
- [ ] Zweryfikowałem nazwy cmdletów/komend w dokumentacji
- [ ] Ścieżki i nazwy serwerów są poprawne dla mojego środowiska
- [ ] Skrypt ma obsługę błędów (try/catch, set -e)
- [ ] Przetestowałem na środowisku testowym / z parametrem -WhatIf
- [ ] Mam backup/snapshot przed uruchomieniem na produkcji
- [ ] Wiem jak cofnąć zmiany jeśli coś pójdzie nie tak

## Integracja AI z narzędziami administracyjnymi

### GitHub Copilot w terminalu

GitHub Copilot oferuje integrację z terminalem (Copilot CLI), która pozwala:
- Opisać zadanie w języku naturalnym i otrzymać komendę
- Wyjaśnić co robi dana komenda
- Zasugerować poprawki do komend

```bash
# Przykład użycia Copilot CLI
gh copilot suggest "find all files larger than 100MB modified in last 7 days"
# Wynik: find / -size +100M -mtime -7 -type f

gh copilot explain "awk '{print $1}' /var/log/auth.log | sort | uniq -c | sort -rn | head -20"
# Wyjaśnienie: Wyświetla 20 najczęstszych adresów IP z logów autoryzacji
```

### AI w Visual Studio Code

Jeśli używasz VS Code do edycji skryptów i konfiguracji:
- **GitHub Copilot** — podpowiedzi kodu w czasie rzeczywistym
- **Copilot Chat** — pytania o kod bezpośrednio w edytorze
- **Inline suggestions** — AI dokańcza linie kodu na podstawie kontekstu

### Przyszłość: AI-powered runbooks

Coraz więcej organizacji tworzy „runbooki" (procedury operacyjne) wspomagane przez AI:
- Automatyczna diagnostyka na podstawie alertu
- Sugerowane kroki naprawcze z historii podobnych incydentów
- Automatyczne wykonanie bezpiecznych kroków (restart usługi, czyszczenie cache)
- Eskalacja do człowieka tylko gdy problem wymaga decyzji

## Podsumowanie rozdziału

Sztuczna inteligencja w administracji systemami to przede wszystkim narzędzie do zwiększenia produktywności i redukcji rutyny. Nie zastępuje wiedzy i doświadczenia administratora — wzmacnia je.

Kluczowe wnioski:

1. **Skryptowanie z AI** jest 5-10x szybsze niż ręczne pisanie — ale wymaga weryfikacji
2. **Analiza alertów** z AI pozwala szybko zidentyfikować root cause w gąszczu powiadomień
3. **Troubleshooting** z AI to jak konsultacja z doświadczonym kolegą — dostępna 24/7
4. **Automatyzacja** rutynowych zadań z AI uwalnia czas na strategiczne projekty
5. **Bezpieczeństwo** jest kluczowe — nigdy nie wklejaj poufnych danych, zawsze testuj na środowisku testowym
6. **Iteracja** jest naturalna — pierwszy prompt rzadko daje idealny wynik, doprecyzuj w kolejnych wiadomościach

W następnym rozdziale przejdziemy do zastosowań AI w zarządzaniu siecią i operacjach telekomunikacyjnych — konfiguracji urządzeń sieciowych, analizy ruchu i rozwiązywania problemów z łącznością.
