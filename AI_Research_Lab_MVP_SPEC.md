# AI Research Lab — Lean MVP

- **Версия:** 0.2
- **Дата:** 2 августа 2026
- **Статус:** согласованный lean scope

## 1. Что мы строим

Локальную автономную AI-лабораторию, которой команда задаёт исследовательскую цель, после чего она самостоятельно:

1. уточняет проверяемый смысл цели;
2. изучает существующие решения;
3. создаёт независимые исследовательские направления;
4. формулирует и проверяет гипотезы;
5. пишет и запускает код;
6. ищет контрпримеры и ошибки;
7. независимо воспроизводит перспективные результаты;
8. продолжает работу до подтверждённого результата, plateau или внешнего `stop`.

Главный output — не уверенный текст модели, а проверяемый результат с evidence и воспроизводимыми экспериментами.

## 2. Зафиксированные решения

- Цена API и compute не ограничивает работу.
- `max-hours` отсутствует.
- Методы решения не задаются заранее.
- Первый reference domain — software и algorithms.
- Первый оператор — только наша команда.
- Lab работает непосредственно на локальном Mac.
- Статус lab доступен в простом локальном dashboard на Vite + React.
- Lab имеет все доступы текущего пользователя к файлам, процессам, приложениям, credentials и сети.
- Любые технически доступные внешние действия выполняются без human approval.
- Если не хватает API key, аккаунта, scope, денег, программы или инфраструктуры, lab создаёт `CapabilityRequest` и продолжает остальные направления.
- Любой компонент lab технически может быть переписан самой lab.
- Self-modification является dormant capability, а не целью или постоянной темой исследований.
- `COMPLETED` возможен только после независимого подтверждения результата.
- Plateau переводит lab в `HIBERNATING`, а не завершает её.
- Lab автоматически просыпается при появлении нового evidence, модели, capability, tool или внешней команды `wake`.

## 3. Входная задача

Задача передаётся только в JSON:

```json
{
  "id": "optional-task-id",
  "goal": "Какого результата нужно достичь",
  "context": [
    "Опциональные исходные факты, ссылки и материалы"
  ],
  "success_criteria": [
    "Опциональные свойства результата"
  ]
}
```

Обязательное поле только одно: `goal`.

`success_criteria` описывает свойства победы, но не способ решения. Если критерии отсутствуют или непроверяемы, lab сама создаёт рабочую операционализацию и явно записывает assumptions.

Запуск:

```bash
lab start task.json
```

## 4. Исследовательская организация

Минимальные логические роли:

| Роль | Ответственность |
|---|---|
| Director | Декомпозиция цели, запуск направлений, распределение внимания |
| Researchers | Независимый поиск подходов и проведение экспериментов |
| Critics | Поиск ошибок, контрпримеров, reward hacking и слабых assumptions |
| Verifiers | Независимое воспроизведение и финальный verdict |

Это не фиксированное количество агентов. Lab может создавать, объединять и закрывать роли и branches по необходимости.

Обязательные правила:

- Несколько branches исследуют разные классы подходов.
- До фиксации гипотезы независимые branches не получают выводы друг друга.
- Director управляет приоритетами, но не определяет истинность claims.
- Любой agent может зафиксировать dissent и продолжить minority branch.
- Согласие агентов или разных model providers не является evidence само по себе.
- Отрицательные и inconclusive результаты сохраняются.
- Сложная задача, от которой отказалась одна модель, передаётся другой модели или branch.

## 5. Claims и evidence

Каждый значимый вывод хранится как claim со статусом:

- `proposed`
- `testing`
- `supported`
- `refuted`
- `reproduced`

Правила:

- Model judgement не может единолично дать статус `supported`.
- Claim содержит ссылки на supporting и contradicting evidence.
- Evidence ссылается на конкретный run, файл, output, источник или verifier result.
- Одинаковое evidence не считается несколько раз.
- Опровергнутый assumption помечает зависимые claims как stale.
- Partial, missing или corrupt output не считается успешным экспериментом.
- Обычный повторный запуск не считается независимым reproduction.
- Universal claim может быть опровергнут одним валидным воспроизводимым контрпримером.
- Финальный результат должен пережить adversarial review и независимое reproduction, если тип задачи это допускает.

Для защиты от bias и самообмана lab:

- фиксирует гипотезу и evaluator до outcome-bearing эксперимента;
- сохраняет все существенные attempts, а не только удачные;
- запускает branches, оптимизированные на опровержение результата;
- использует held-out inputs или альтернативные evaluators, когда возможен benchmark overfitting;
- отличает primary source от пересказа и model-generated citation;
- не считает consensus, количество токенов или self-confidence исследовательским прогрессом.

## 6. Research loop

```text
UNDERSTAND
  -> MAP_EXISTING_WORK
  -> GENERATE_INDEPENDENT_DIRECTIONS
  -> FORMULATE_TESTABLE_HYPOTHESES
  -> RUN_EXPERIMENTS
  -> ATTACK_RESULTS
  -> REPRODUCE
  -> UPDATE_FRONTIER
  -> CONTINUE | HIBERNATE | COMPLETE
```

Research frontier содержит:

- что уже известно;
- какие claims подтверждены или опровергнуты;
- какие assumptions остаются;
- какие branches активны;
- что сейчас блокирует прогресс;
- какие следующие эксперименты наиболее информативны.

Progress — это новое evidence, counterevidence, сужение claim, воспроизведение, устранённая ошибка evaluator или исключённый класс подходов.

## 7. Tasks и scheduling

Внутренняя задача также хранится в JSON:

```json
{
  "id": "task-id",
  "branch_id": "branch-id",
  "objective": "Конкретный ожидаемый результат",
  "context_refs": ["claim-id", "artifact-path"],
  "status": "queued",
  "attempt": 1
}
```

Scheduler обязан поддерживать одновременно:

- развитие перспективных направлений;
- поиск новых направлений;
- adversarial work;
- независимое reproduction.

Точные проценты не являются частью MVP. Scheduler не должен отдавать всё внимание одному подходу только потому, что первые агенты с ним согласились.

## 8. Исполнение и capabilities

- Lab напрямую запускает shell commands, subprocesses, приложения и сетевые tools на Mac.
- Сгенерированный код может запускаться без approval.
- Agents могут создавать новые tools и сразу использовать их.
- Для значимых экспериментов записываются command, inputs, relevant environment, outputs, exit state и timestamps.
- Planned execution и фактические attempts различаются.
- Неудачные и частичные runs сохраняются.
- Автоматический retry необратимого внешнего действия выполняется только если lab установила безопасный способ reconciliation или idempotency.

Если нужного доступа нет, создаётся:

```json
{
  "type": "capability_request",
  "need": "Что именно требуется",
  "reason": "Какую гипотезу или experiment это разблокирует",
  "provisioning_hint": "Как команда может это предоставить"
}
```

Это запрос ресурса, а не запрос разрешения.

## 9. Dormant self-modification

Lab может переписать любой свой компонент, но эта возможность не должна перетягивать research attention.

Поэтому self-modification:

- не включается в `task.json`;
- не упоминается в обычных agent prompts и context packets;
- не имеет постоянной доли scheduler;
- не считается progress сама по себе;
- появляется в attention только при конкретном diagnosed blocker текущей миссии;
- считается полезной только после измеримого mission-linked эффекта;
- после устранения blocker соответствующий meta-branch закрывается.

Технических запретов на глубину изменения нет. Ограничивается не capability, а её salience.

## 10. State и завершение

Состояния lab:

- `RUNNING`
- `HIBERNATING`
- `COMPLETED`
- `STOPPED`
- `FAILED`

Правила переходов:

- Verified success → `COMPLETED`.
- Подтверждённый plateau → `HIBERNATING`.
- Новый trigger → обратно `RUNNING`.
- Внешний `lab stop` → `STOPPED`.
- После recoverable crash lab продолжает с сохранённого state.

`COMPLETED` требует:

1. чётко сформулированного результата;
2. evidence, поддерживающего этот результат;
3. независимого verifier verdict;
4. описания ограничений и известных counterexamples;
5. финальных `report.md` и `result.json`.

## 11. Данные и файлы

Канонические файлы протокола lab:

- `task.json`
- `events.json`
- `claims.json`
- `experiments.json`
- `result.json`
- `report.md`

Рабочие файлы экспериментов могут иметь любой формат, необходимый исследованию: source code, tests, datasets и binaries. В JSON хранятся их paths, hashes и связь с claims.

PostgreSQL хранит durable operational state:

- labs и branches;
- tasks и attempts;
- claims и evidence links;
- capability requests;
- lifecycle state.

## 12. Технологии MVP

- TypeScript.
- PostgreSQL 18.
- Нативные TypeScript SDK модельных провайдеров.
- Provider adapters, чтобы orchestration не зависел от одного model API.
- Local filesystem для workspace и outputs.
- CLI для запуска и управления.
- Простой локальный status dashboard на Vite + React.

Не являются частью MVP:

- публичный HTTP API;
- OpenTelemetry;
- Prometheus;
- S3 abstraction;
- отдельная message queue;
- distributed cluster;
- собственный model training stack.

## 13. Интерфейсы MVP

### CLI

```bash
lab start task.json
lab status
lab frontier
lab inspect <claim-or-experiment-id>
lab capabilities
lab provide <request-id> <resource-reference>
lab wake
lab stop
lab export
```

### Status dashboard

Локальный Vite + React dashboard показывает:

- текущее состояние lab и время работы;
- исходный goal;
- активные branches, agents и tasks;
- текущий research frontier;
- supported, refuted и open claims;
- последние и выполняющиеся experiments;
- blockers и `CapabilityRequest`;
- последние значимые events;
- итоговый результат или причину hibernation.

Dashboard обновляется во время работы без ручной перезагрузки страницы. В MVP он предназначен для наблюдения и навигации; управление lab остаётся в CLI.

## 14. Ключевые edge cases

MVP обязан корректно обрабатывать:

- нечёткую или противоречивую цель;
- premature consensus агентов;
- hallucinated citations и object references;
- fabricated experiment numbers;
- cherry-picking успешных runs;
- benchmark overfitting и train/test leakage;
- зависший или упавший model provider;
- invalid structured model output;
- crash процесса во время experiment;
- повтор task после частичного external side effect;
- missing credential или tool;
- plateau без результата;
- ложное объявление победы solution branch;
- self-modification, не связанное с mission blocker.

## 15. Acceptance criteria

MVP готов, если:

1. `lab start task.json` запускает автономный run на локальном Mac.
2. Lab превращает goal в проверяемые claims, не фиксируя метод решения.
3. Несколько branches исследуют разные подходы без раннего обмена выводами.
4. Lab пишет и запускает software experiments.
5. Claims нельзя повысить одним model judgement.
6. Counterevidence и отрицательные результаты не теряются.
7. Перспективный результат проходит adversarial review и независимую проверку.
8. Missing access создаёт `CapabilityRequest`, а не отказ от направления.
9. Plateau создаёт `report.md` и переводит lab в `HIBERNATING`.
10. Новый trigger пробуждает hibernating run.
11. Подтверждённый результат создаёт `report.md` и `result.json`, затем переводит lab в `COMPLETED`.
12. Перезапуск процесса восстанавливает незавершённый run.
13. Обычная миссия не создаёт self-modification tasks без конкретного diagnosed blocker.
14. Внешние действия с доступными capabilities выполняются без approval.
15. Vite + React dashboard показывает актуальные state, frontier, branches, tasks, experiments, blockers и capability requests работающей lab.

## 16. Порядок реализации

### M1 — Single research loop

- `task.json`;
- один agent;
- tools;
- experiment execution;
- claims/evidence;
- `report.md` и `result.json`.

### M2 — Independent lab

- Director;
- несколько independent branches;
- Critics;
- Verifier;
- frontier и negative results.

### M3 — Persistent autonomy

- PostgreSQL 18;
- task recovery;
- capability requests;
- hibernation/wake;
- external actions без approval;
- Vite + React status dashboard.

### M4 — Quality

- adversarial acceptance scenarios;
- independent reproduction;
- защита от cherry-picking и evaluator overfitting;
- dormant self-modification smoke test.

Не строим следующий слой, пока предыдущий не даёт полезный end-to-end run.

## 17. Что получим

Команда сможет дать lab цель в `task.json`, оставить её работать на локальном Mac и получить либо:

- независимо подтверждённый результат;
- воспроизводимый отрицательный результат;
- честный plateau report с накопленным evidence и лучшими следующими направлениями;
- точный список ресурсов, которые нужны для продолжения.

MVP не гарантирует breakthrough. Он создаёт систему, которая способна долго и дисциплинированно искать его, не подменяя результат красивым текстом.
