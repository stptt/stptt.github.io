(() => {
  'use strict';
  const C = window.COURSE;
  const app = document.getElementById('app');
  if (!C || C.version !== '2' || !Array.isArray(C.lessons) || C.lessons[0]?.id !== 'wiki') {
    app.innerHTML = '<main id="main" class="intro"><h1>Не удалось загрузить материал</h1><p>Обновите страницу. Если это не помогло, попробуйте открыть сайт позже.</p></main>';
    return;
  }
  const KEY = 'ennera-envy-practice-v2';
  const PREP = C.preparation || {};
  const prepItems = Array.isArray(PREP.items) ? PREP.items : [];
  const prepConfigured = prepItems.length === 4 && prepItems.every(item => typeof item.id === 'string' && item.id.length > 0) && new Set(prepItems.map(item => item.id)).size === 4;
  const WIKI_URL = 'https://wiki.my-jarvis.ru/';
  const BITRIX_URL = 'https://bitrix-dev.ennera.ru/';
  const ENVY_URL = 'https://nvai.ennera.ru/';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fresh = () => ({version:C.version,started:false,view:'intro',current:0,progress:{},preparation:{},finalPractice:false});
  let state = fresh();
  let storageOK = true;
  let demo = 0;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.version === C.version && typeof data.progress === 'object' && data.progress !== null) {
        state.started = data.started === true;
        state.view = ['intro','preparation','lesson','finish'].includes(data.view) ? data.view : 'intro';
        state.current = Number.isInteger(data.current) && data.current >= 0 && data.current < C.lessons.length ? data.current : 0;
        state.finalPractice = data.finalPractice === true;
        for (const item of prepItems) state.preparation[item.id] = data.preparation?.[item.id] === true;
        for (const lesson of C.lessons) {
          const p = data.progress[lesson.id];
          if (!p || typeof p !== 'object') continue;
          const selected = Number.isInteger(p.selected) && p.selected >= 0 && p.selected < lesson.question.options.length ? p.selected : null;
          const attempts = Number.isSafeInteger(p.attempts) && p.attempts >= 0 ? p.attempts : 0;
          state.progress[lesson.id] = {
            practice:p.practice === true, correct:p.correct === true && selected === lesson.question.correct && attempts > 0,
            selected, attempts, firstTry:p.firstTry === true && attempts === 1 && p.correct === true && selected === lesson.question.correct,
            feedbackShown:p.feedbackShown === true && selected !== null && attempts > 0
          };
        }
      }
    }
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (error) {
    if (error instanceof SyntaxError) {
      state = fresh();
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { storageOK = false; }
    } else storageOK = false;
  }
  function progress(lesson) {
    if (!state.progress[lesson.id]) state.progress[lesson.id] = {practice:false,correct:false,selected:null,attempts:0,firstTry:false,feedbackShown:false};
    return state.progress[lesson.id];
  }
  const wikiDone = () => {
    const wiki = C.lessons[0];
    return wiki.id === 'wiki' && progress(wiki).practice && progress(wiki).correct;
  };
  const prepCount = () => prepItems.filter(item => state.preparation[item.id] === true).length;
  const prepDone = () => prepConfigured && prepCount() === 4;
  const canOpenLesson = index => prepDone() && Number.isInteger(index) && index >= 0 && index < C.lessons.length && (index === 0 || wikiDone());
  const completed = () => wikiDone() ? C.lessons.filter(l => progress(l).practice && progress(l).correct).length : 0;
  const lessonsDone = () => wikiDone() && completed() === C.lessons.length;
  const allDone = () => prepDone() && lessonsDone();
  function enforceRoute() {
    if (!lessonsDone()) state.finalPractice = false;
    if (!prepDone()) {
      if (state.view === 'lesson' || state.view === 'finish') state.view = 'preparation';
      return;
    }
    if (!canOpenLesson(state.current)) state.current = 0;
    if (state.view === 'finish' && !lessonsDone()) state.view = 'lesson';
  }
  enforceRoute();
  function save() {
    if (!storageOK) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { storageOK = false; document.getElementById('storage-warning').hidden = false; }
  }
  document.getElementById('storage-warning').hidden = storageOK;
  function announce(message) { document.getElementById('announcer').textContent = message; }
  const promptBox = (prompt, label = 'Запрос для агента', id = 'lesson-prompt') => prompt ? `<div class="prompt-box"><div class="prompt-head"><span>${esc(label)}</span><button class="copy-button" data-copy="${id}">Скопировать</button></div><pre id="${id}" tabindex="0">${esc(prompt)}</pre></div>` : '';
  const checkList = items => `<ul class="checklist">${(items || []).map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
  const linksHTML = links => (links || []).filter(link => /^https:\/\//.test(link.url)).map(link => `<a class="external-link" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.label)} ↗<span class="sr-only"> в новой вкладке</span></a>`).join('');
  const attachmentHTML = lesson => lesson.attachment ? `<div class="attachment"><button class="button secondary" data-action="attachment">Скачать учебный файл ↓</button><span class="small muted">${esc(lesson.attachment.name)} · TXT</span></div>` : '';
  function downloadText(text, name) {
    const url = URL.createObjectURL(new Blob(['\ufeff' + text], {type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = name.replace(/[\\/]/g, '_');
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function sidebar() {
    const n = completed();
    return `<aside class="sidebar" aria-label="Программа практикума"><div class="sidebar-title">Ваш маршрут</div><button class="prep-nav" data-action="preparation" ${state.view==='preparation'?'aria-current="step"':''}><span>Подготовка к работе</span><span class="prep-nav-count">${prepDone()?'✓':`${prepCount()}/4`}</span></button><div class="progress-label"><span id="progress-text">Пройдено ${n} из ${C.lessons.length} шагов</span><span id="progress-percent">${Math.round(n/C.lessons.length*100)}%</span></div><div class="progress" role="progressbar" aria-label="Пройденные шаги" aria-valuemin="0" aria-valuemax="${C.lessons.length}" aria-valuenow="${n}"><span style="width:${n/C.lessons.length*100}%"></span></div><ol class="roadmap">${C.lessons.map((l,i) => {
      const p=progress(l); const allowed=canOpenLesson(i); const done=allowed&&p.practice&&p.correct;
      return `<li><button class="nav-step ${done?'complete':''}" data-lesson="${i}" ${allowed?'':'disabled'} ${state.view==='lesson'&&state.current===i?'aria-current="step"':''} aria-label="Шаг ${i+1}. ${esc(l.shortTitle || l.title)}${done?'. Пройден':''}${allowed?'':(prepDone()?'. Сначала завершите шаг о вики':'. Сначала завершите подготовку')}"><span class="nav-number" aria-hidden="true">${done?'✓':String(i+1).padStart(2,'0')}</span><span class="nav-name">${esc(l.shortTitle || l.title)}</span></button></li>`;
    }).join('')}<li><button class="nav-step" data-action="finish" ${state.view==='finish'?'aria-current="step"':''} ${allDone()?'':'disabled'} aria-label="Итоговая практика${allDone()?'':'. Откроется после пяти шагов'}"><span class="nav-number" aria-hidden="true">↗</span><span class="nav-name">Итоговая практика</span></button></li></ol><p class="route-note">${!prepDone()?'Отметьте четыре пункта подготовки, чтобы открыть первый шаг.':wikiDone()?'Идите по порядку: упражнения связаны. К любому пройденному шагу можно вернуться.':'Сначала откройте вики и завершите первый шаг. После него станут доступны остальные.'}</p><div class="sidebar-bottom"><p>Можно сделать паузу.<br>Прогресс сохранится в этом браузере.</p><button class="text-button" data-action="home">О практикуме</button></div></aside>`;
  }
  function preparationHTML() {
    return `<article class="lesson preparation"><div class="lesson-meta"><span>Перед первым шагом</span><span class="pill">4 проверки</span></div><div class="eyebrow">ENVY AI · Начало работы</div><h1 tabindex="-1">${esc(PREP.title || 'Подготовка к работе')}</h1><p class="lesson-lead">${esc(PREP.lead || 'Подготовьте доступ к системе и отметьте выполненные действия.')}</p>${PREP.note?`<div class="key-note"><p>${esc(PREP.note)}</p></div>`:''}${prepConfigured?`<ol class="preparation-list">${prepItems.map((item,i)=>`<li class="preparation-card"><div class="preparation-heading"><span class="prep-number" aria-hidden="true">${i+1}</span><h2>${esc(item.title)}</h2></div><p>${esc(item.text)}</p>${item.link?`<div class="resource-links">${linksHTML([item.link])}</div>`:''}<label class="done-label"><input type="checkbox" data-prep="${esc(item.id)}" id="prep-${esc(item.id)}" ${state.preparation[item.id]===true?'checked':''}><span>${esc(item.checkLabel || 'Я выполнил(а) это действие')}</span></label></li>`).join('')}</ol>`:'<p class="key-note">Не удалось загрузить пункты подготовки. Обновите страницу или обратитесь к администратору системы.</p>'}<div class="preparation-finish"><p id="prep-status" class="prep-status" role="status">${prepDone()?'Подготовка завершена. Можно переходить к вики.':`Отмечено ${prepCount()} из 4 пунктов`}</p><button class="button primary" id="prep-continue" data-action="prep-next" ${prepDone()?'':'disabled'}>Перейти к шагу 1: вики <span aria-hidden="true">→</span></button><p class="small muted">Галочки — ваша отметка о выполнении. Этот сайт не проверяет вход и ответы агента автоматически.</p></div><div class="preparation-help"><strong>Если что-то не работает</strong><p>${esc(PREP.helpText || 'Обратитесь к администратору системы. Не отмечайте невыполненный пункт как готовый.')}</p></div></article>`;
  }
  function updatePreparationControls() {
    document.getElementById('prep-continue').disabled = !prepDone();
    document.getElementById('prep-status').textContent = prepDone() ? 'Подготовка завершена. Можно переходить к вики.' : `Отмечено ${prepCount()} из 4 пунктов`;
    const sidebarElement = app.querySelector('.sidebar');
    if (sidebarElement) sidebarElement.outerHTML = sidebar();
  }
  function intro() {
    return `<main id="main" class="intro"><section class="hero"><div class="hero-copy"><div class="eyebrow">ENVY AI · Практикум для сотрудников</div><h1 tabindex="-1">${esc(C.title)}</h1><p>${esc(C.subtitle)}</p><div class="hero-meta"><span class="meta-item"><i class="meta-dot"></i>Около 25 минут</span><span class="meta-item"><i class="meta-dot"></i>Подготовка + ${C.lessons.length} шагов</span><span class="meta-item"><i class="meta-dot"></i>Без опыта с ИИ</span></div><div class="button-row"><button class="button primary" data-action="start">${!state.started?'Подготовиться к работе':!prepDone()?'Продолжить подготовку':'Продолжить практикум'} <span aria-hidden="true">→</span></button>${state.started?`<span class="small muted">Пройдено ${completed()} из ${C.lessons.length}</span>`:''}</div><p class="hero-action-note">${esc(PREP.introNote || 'Сначала войдите в Битрикс24 и ENVY AI и получите ответ от «ИИ помощник» в обоих чатах. Затем перейдём к вики и упражнениям.')}</p></div><div class="illustration" aria-label="Маршрут знакомства с ENVY AI"><div class="illustration-top"><span>Сначала разобраться. Потом попробовать.</span><i aria-hidden="true"></i></div><div class="chat-demo user"><div class="chat-person">Подготовка к работе</div><p>Войдите в обе системы и проверьте, что «ИИ помощник» отвечает в каждом чате.</p></div><div class="chat-demo"><div class="chat-person">Вики и пять учебных шагов</div><p>Найдите инструкцию, дайте задачу агенту, уточните ответ и попробуйте учебный файл.</p><div class="demo-tags"><span>Сверить с исходником</span><span>Проверить результат</span></div></div><p class="illustration-caption">Маршрут практикума. Действия выполняете вы.</p></div></section><section class="intro-strip" aria-label="Как будем учиться"><div><strong>Подготовим доступ</strong><p>Войдём в обе системы и проверим личные чаты.</p></div><div><strong>Разберёмся в вики</strong><p>Найдём подсказки перед работой с агентом.</p></div><div><strong>Попробуем и проверим</strong><p>Задача, уточнение и файл — с проверкой результата.</p></div></section><section><div class="section-heading"><h2>Что вы сделаете</h2><p>Подготовка, затем пять шагов практики</p></div><div class="lesson-preview-list">${C.lessons.map((l,i)=>`<div class="lesson-preview"><span class="number">${String(i+1).padStart(2,'0')}</span><h3>${esc(l.shortTitle||l.title)}</h3><p>${esc(l.minutes)} мин</p></div>`).join('')}</div></section><section class="walkthrough"><div><h3>Вкладки для практики</h3><p>Этот сайт показывает задания и сохраняет ваши отметки. Вики помогает разобраться, а личный бот в Битрикс24 выполняет учебные поручения.</p></div><div><div class="demo-controls" role="tablist" aria-label="Как пройти практику">${['Вики','Практика','Проверка'].map((s,i)=>`<button role="tab" id="demo-tab-${i}" aria-controls="demo-panel" class="demo-tab" data-demo="${i}" aria-selected="${demo===i}" tabindex="${demo===i?0:-1}">${i+1}. ${s}</button>`).join('')}</div><div class="demo-panel" id="demo-panel" role="tabpanel" aria-labelledby="demo-tab-${demo}">${demoContent()}</div></div></section><div class="before-start"><span class="note-icon" aria-hidden="true">↗</span><p><strong>Перед началом.</strong> ${esc(PREP.introBeforeStart || 'В подготовке проверим и Битрикс24, и ENVY AI. Для входа может потребоваться несколько минут. На этом учебном сайте регистрация не нужна.')}</p></div><div class="resource-links intro-links">${linksHTML([{label:'Вики ENVY AI',url:WIKI_URL},{label:'Битрикс24',url:BITRIX_URL},{label:'ENVY AI: веб-чат',url:ENVY_URL}])}</div><details class="access-help"><summary>Если не получается найти бота или войти</summary><p>Нужный агент называется «ИИ помощник». Если не получается войти, найти его или получить ответ, обратитесь к администратору системы.</p><p>Вкладку с практикумом оставьте открытой. После действия в вики или чате вернитесь сюда и проверьте результат. Чтение примера не заменяет выполненную практику.</p><p>Если нужная функция недоступна, запишите, на каком шаге это произошло, и обратитесь к администратору системы. Не отмечайте невыполненное упражнение как готовое.</p></details></main>`;
  }
  function demoContent() {
    return [
      '<p>Откройте вики ENVY AI. Найдите инструкцию по первому сообщению и задайте помощнику вики вопрос по работе с системой.</p><small>Вики помогает понять возможности и порядок действий.</small>',
      '<p>В личном чате с ботом Битрикс24 объясните задачу обычными словами. Отправьте уточнение в том же диалоге.</p><small>Агент называется «ИИ помощник». Доступ к обоим чатам вы проверите на этапе подготовки.</small>',
      '<p>Сравните ответ с учебным исходником: факты сохранены? Ничего не придумано? Нужный формат соблюдён?</p><small>Этот сайт не читает чат и не проверяет ответы агента автоматически.</small>'
    ][demo];
  }
  const nextLabel = () => state.current === C.lessons.length - 1 ? (allDone() ? 'К итоговой практике' : 'К непройденному шагу') : 'Следующий шаг';
  function lessonHTML() {
    const l=C.lessons[state.current]; const p=progress(l);
    return `<article class="lesson"><div class="lesson-meta"><span>Шаг ${state.current+1} из ${C.lessons.length}</span><span class="pill">${esc(l.minutes)} мин</span></div><div class="eyebrow">${esc(l.kicker)}</div><h1 tabindex="-1">${esc(l.title)}</h1><p class="lesson-lead">${esc(l.lead)}</p><div class="story"><div class="story-label">Ваша рабочая ситуация</div><p>${esc(l.story)}</p></div>${l.resources?.length?`<aside class="lesson-resources" aria-label="Материалы вики"><div class="section-label">Вики к этому шагу</div><div class="resource-links">${linksHTML(l.resources)}</div></aside>`:''}<div class="lesson-body">${l.paragraphs.map(t=>`<p>${esc(t)}</p>`).join('')}</div>${l.key?`<div class="key-note"><h3>${esc(l.key.title)}</h3><p>${esc(l.key.text)}</p></div>`:''}${l.example?`<section class="example"><div class="example-label">${esc(l.example.label)}</div><div class="example-columns"><div class="example-cell"><strong>Обратите внимание</strong><p>${esc(l.example.before)}</p></div><div class="example-cell good"><strong>Как сделать лучше</strong><p>${esc(l.example.after)}</p></div></div>${l.example.note?`<p class="example-note">${esc(l.example.note)}</p>`:''}</section>`:''}<section class="practice" aria-labelledby="practice-heading"><div class="section-label">Теперь попробуйте</div><h2 id="practice-heading">${esc(l.practiceTitle || 'Практика в ENVY AI')}</h2><ol>${l.practice.map(t=>`<li>${esc(t)}</li>`).join('')}</ol>${attachmentHTML(l)}${promptBox(l.prompt, l.promptLabel)}${l.practiceNote?`<p class="practice-note">${esc(l.practiceNote)}</p>`:''}${l.practiceLinks?.length?`<div class="resource-links">${linksHTML(l.practiceLinks)}</div>`:''}<p class="checklist-title">Проверьте свой результат</p>${checkList(l.checklist)}<label class="done-label"><input type="checkbox" id="practice-done" ${p.practice?'checked':''}><span>Я выполнил(а) упражнение и проверил(а) результат<small>Отметьте после самостоятельного действия. Сайт не видит вашу работу в вики или чате.</small></span></label></section><section class="quiz" aria-labelledby="quiz-heading"><div class="section-label">Закрепим на примере</div><h2 id="quiz-heading">Один вопрос по ситуации</h2><form id="quiz-form"><fieldset><legend>${esc(l.question.text)}</legend><div class="answers">${l.question.options.map((o,i)=>`<label class="answer"><input type="radio" name="answer" value="${i}" ${p.selected===i?'checked':''} ${p.correct?'disabled':''}><span><span class="answer-letter">${['А','Б','В','Г'][i]}.</span> ${esc(o.text)}</span></label>`).join('')}</div></fieldset><div class="quiz-actions"><button class="button secondary" id="check-answer" type="submit" ${p.selected===null||p.correct||p.feedbackShown?'disabled':''}>${p.correct?'Ответ верный ✓':'Проверить ответ'}</button><span class="quiz-hint">Один правильный ответ. Попытки не ограничены.</span></div></form><div id="quiz-feedback" ${p.feedbackShown?'':'hidden'}>${p.feedbackShown?feedback(l,p):''}</div></section><div class="lesson-bottom"><p class="next-help" id="next-help">${nextHelp(p)}</p><div class="button-row">${state.current>0?'<button class="back-button" data-action="previous">← Назад</button>':''}<button class="button primary" id="next-lesson" data-action="next" ${p.practice&&p.correct?'':'disabled'}>${nextLabel()} <span aria-hidden="true">→</span></button></div></div></article>`;
  }
  const nextHelp = p => p.practice&&p.correct?'Шаг пройден. Можно двигаться дальше.':!p.practice&&!p.correct?'Чтобы продолжить, выполните практику и ответьте на вопрос.':!p.practice?'Осталось выполнить практику и отметить результат.':'Осталось выбрать верный ответ. Разбор поможет разобраться.';
  const feedback = (l,p) => `<div class="feedback ${p.correct?'':'wrong'}" role="status"><strong>${p.correct?'Верно. Вот почему':'Давайте разберёмся'}</strong><p>${esc(l.question.options[p.selected].feedback)}</p>${p.correct?'':'<p class="small" style="margin-top:10px">Выберите другой вариант и снова нажмите «Проверить ответ».</p>'}</div>`;
  function finishHTML() {
    const first=C.lessons.filter(l=>progress(l).firstTry).length;
    const f=C.finalTask;
    return `<article class="lesson"><div class="completion-banner"><div class="eyebrow">${state.finalPractice?'Практикум завершён':'Последнее небольшое задание'}</div><h1 tabindex="-1">${state.finalPractice?'Теперь у вас есть первый опыт':'Пять шагов пройдены'}</h1><p>${state.finalPractice?'Вы прошли путь: вики → задача → уточнение → файл → проверка. Теперь у вас есть первый опыт работы с ENVY AI.':'Попробуйте применить всё вместе — без готового ответа. Это поможет закрепить навык.'}</p></div><div class="result-stats"><div><strong>${C.lessons.length}/${C.lessons.length}</strong><span>шагов с практикой</span></div><div><strong>${first}/${C.lessons.length}</strong><span>ответов с первой попытки</span></div><div><strong>${state.finalPractice?'✓':'→'}</strong><span>${state.finalPractice?'итоговая практика выполнена':'итоговая практика впереди'}</span></div></div><section class="practice final-task" aria-labelledby="final-title"><div class="section-label">Самостоятельная практика</div><h2 id="final-title">${esc(f.title)}</h2><p>${esc(f.text)}</p>${f.prompt?`<details class="hint"><summary>Нужна подсказка?</summary><p>${esc(f.prompt)}</p></details>`:''}<div class="resource-links">${linksHTML([{label:'Открыть Битрикс24',url:BITRIX_URL},{label:'Открыть вики',url:WIKI_URL}])}</div><p class="checklist-title">Проверьте себя</p>${checkList(f.checklist)}<label class="done-label"><input type="checkbox" id="final-done" ${state.finalPractice?'checked':''}><span>Я выполнил(а) итоговое задание<small>Это самостоятельная проверка. Ответ агента оцениваете вы.</small></span></label></section><section><h2>Что вы уже попробовали</h2><ul class="result-list">${C.lessons.map(l=>`<li><span aria-hidden="true">✓</span>${esc(l.shortTitle||l.title)}</li>`).join('')}</ul><p class="result-note">Ошибки в вопросах — часть обучения. Важнее разобраться в объяснениях и попробовать действие самостоятельно. Результат — памятка о прохождении, а не аттестация. Файл можно передать тренеру вручную; автоматически результаты никому не отправляются.</p><div class="button-row report-actions"><button class="button primary" data-action="download" ${state.finalPractice?'':'disabled'}>Скачать результат ↓</button><button class="button secondary" data-action="print" ${state.finalPractice?'':'disabled'}>Распечатать</button></div>${!state.finalPractice?'<p class="small muted" style="margin-top:12px">Результат можно сохранить после итоговой практики.</p>':''}</section><div class="next-stage"><h3>Сохраните вики под рукой</h3><p>Когда появится новая задача, сначала сверьтесь с инструкцией. Возможности агента зависят от подключений и ваших прав. Работу с реальными данными и дополнительные функции согласуйте с организатором.</p></div><div class="print-only"><h2>Памятка</h2><p>Вики → задача → уточнение → файл → проверка. Сверяйте ответ агента с исходными данными.</p><p>Практика отмечена самим участником. Результат не является сертификатом или подтверждением квалификации.</p></div><button class="text-button" data-lesson="0">Вернуться к первому шагу</button><button class="reset-link" data-action="reset">Сбросить прогресс и пройти заново</button></article>`;
  }
  function render(focus=false) {
    enforceRoute();
    app.innerHTML = state.view==='intro' ? intro() : `<div class="learning-layout">${sidebar()}<main id="main">${state.view==='preparation'?preparationHTML():state.view==='finish'?finishHTML():lessonHTML()}</main></div>`;
    if(focus) { window.scrollTo({top:0,behavior:'instant'}); app.querySelector('h1')?.focus({preventScroll:true}); }
    save();
  }
  function updateLessonControls() {
    const p=progress(C.lessons[state.current]);
    document.getElementById('next-lesson').disabled = !(p.practice&&p.correct);
    document.getElementById('next-lesson').innerHTML = `${nextLabel()} <span aria-hidden="true">→</span>`;
    document.getElementById('next-help').textContent=nextHelp(p);
    const old=app.querySelector('.sidebar');
    old.outerHTML=sidebar();
  }
  function report() {
    return ['ЭННЕРА — Первые шаги с ENVY AI','Самостоятельный вводный практикум','',`Дата сохранения: ${new Date().toLocaleDateString('ru-RU')}`,'Подготовка: четыре пункта отмечены участником',`Пройдено шагов: ${completed()} из ${C.lessons.length}`,`Верно с первой попытки: ${C.lessons.filter(l=>progress(l).firstTry).length} из ${C.lessons.length}`,'Итоговая практика: отмечена как выполненная участником','',...C.lessons.map((l,i)=>`${i+1}. ${l.title} — практика отмечена, вопрос разобран (попыток: ${progress(l).attempts})`),'','Памятка: вики → задача → уточнение → файл → проверка. Сверяйте ответ агента с исходными данными.','','Результат основан на ответах в тестах и самостоятельных отметках участника. Сайт не читает и не проверяет диалоги в ENVY AI или Битрикс24. Это не аттестация и не сертификат.','Справочник системы: https://wiki.my-jarvis.ru/'].join('\n');
  }
  document.addEventListener('click',async event=>{
    const target=event.target.closest('button,a[data-action]');
    if(!target || target.disabled) return;
    if(target.dataset.copy) {
      const el=document.getElementById(target.dataset.copy);
      try { await navigator.clipboard.writeText(el.textContent); target.textContent='Скопировано ✓'; announce('Текст скопирован. Вставьте его в поле сообщения, указанное в задании.'); }
      catch { const range=document.createRange(); range.selectNodeContents(el); const selection=window.getSelection(); selection.removeAllRanges(); selection.addRange(range); target.textContent='Нажмите Ctrl+C'; announce('Не удалось скопировать автоматически. Текст выделен: нажмите Ctrl+C или используйте меню копирования.'); }
      return;
    }
    if(target.dataset.demo !== undefined) { demo=Number(target.dataset.demo); app.querySelectorAll('[data-demo]').forEach(b=>{const active=Number(b.dataset.demo)===demo;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;}); const panel=document.getElementById('demo-panel'); panel.innerHTML=demoContent(); panel.setAttribute('aria-labelledby',`demo-tab-${demo}`); return; }
    if(target.dataset.lesson !== undefined) { const index=Number(target.dataset.lesson); if(!canOpenLesson(index)) {if(!prepDone()){state.started=true;state.view='preparation';render(true);announce('Сначала завершите четыре пункта подготовки.');}else announce('Сначала завершите первый шаг о вики.');return;} state.started=true; state.current=index; state.view='lesson'; render(true); return; }
    switch(target.dataset.action) {
      case 'home': event.preventDefault(); state.view='intro'; render(true); break;
      case 'start': state.started=true; if(!prepDone())state.view='preparation';else{state.view=allDone()?'finish':'lesson';if(!allDone())state.current=C.lessons.findIndex(l=>!(progress(l).practice&&progress(l).correct));}render(true);break;
      case 'preparation': state.started=true;state.view='preparation';render(true);break;
      case 'prep-next': if(prepDone()){state.started=true;state.current=0;state.view='lesson';render(true);}break;
      case 'previous': state.current=Math.max(0,state.current-1); render(true); break;
      case 'next': { if(!canOpenLesson(state.current)){enforceRoute();render(true);return;}const p=progress(C.lessons[state.current]); if(!(p.practice&&p.correct)) return; if(state.current<C.lessons.length-1) state.current++; else if(allDone()) state.view='finish'; else state.current=C.lessons.findIndex(l=>!(progress(l).practice&&progress(l).correct)); render(true); break; }
      case 'finish': if(allDone()){state.view='finish';render(true);}else if(!prepDone()){state.view='preparation';render(true);}break;
      case 'attachment': {const lesson=C.lessons[state.current];if(state.view==='lesson'&&canOpenLesson(state.current)&&lesson.attachment){downloadText(lesson.attachment.text,lesson.attachment.name);announce('Учебный файл скачан. Прикрепите его в чат по инструкции шага.');}break;}
      case 'download': if(allDone()&&state.finalPractice) {downloadText(report(),'envy-practice-result.txt');announce('Результат сохранён в текстовый файл.');} break;
      case 'print': if(allDone()&&state.finalPractice) window.print(); break;
      case 'reset': if(window.confirm('Сбросить только прогресс этого практикума в этом браузере? Ответы и отметки придётся заполнить заново.')) { state=fresh(); render(true); announce('Прогресс практикума сброшен.'); } break;
    }
  });
  document.addEventListener('change',event=>{
    const target=event.target;
    if(target.dataset?.prep!==undefined){const id=target.dataset.prep;if(state.view!=='preparation'||!prepItems.some(item=>item.id===id))return;state.preparation[id]=target.checked===true;save();updatePreparationControls();return;}
    if(target.id==='practice-done' && state.view==='lesson' && canOpenLesson(state.current)) { const p=progress(C.lessons[state.current]);p.practice=target.checked;if(!allDone())state.finalPractice=false;save();updateLessonControls();announce(p.practice?'Практика отмечена как выполненная.':'Отметка о практике снята.'); }
    if(target.name==='answer' && state.view==='lesson' && canOpenLesson(state.current)) { const p=progress(C.lessons[state.current]);if(p.correct)return;p.selected=Number(target.value);p.feedbackShown=false;save();document.getElementById('quiz-feedback').hidden=true;document.getElementById('check-answer').disabled=false; }
    if(target.id==='final-done' && state.view==='finish' && allDone()) { state.finalPractice=target.checked;save();render(false);document.getElementById('final-done')?.focus({preventScroll:true});announce(state.finalPractice?'Итоговая практика отмечена. Можно сохранить результат.':'Отметка итоговой практики снята.'); }
  });
  document.addEventListener('submit',event=>{
    if(event.target.id!=='quiz-form'||state.view!=='lesson'||!canOpenLesson(state.current))return;event.preventDefault();const l=C.lessons[state.current];const p=progress(l);if(p.selected===null||p.correct||p.feedbackShown)return;p.attempts++;p.correct=p.selected===l.question.correct;p.firstTry=p.correct&&p.attempts===1;p.feedbackShown=true;save();const region=document.getElementById('quiz-feedback');region.hidden=false;region.innerHTML=feedback(l,p);const button=document.getElementById('check-answer');button.disabled=true;if(p.correct){button.textContent='Ответ верный ✓';event.target.querySelectorAll('input').forEach(el=>el.disabled=true);}updateLessonControls();
  });
  document.addEventListener('keydown',event=>{
    const target=event.target.closest('[data-demo]');if(!target||!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;event.preventDefault();let n=Number(target.dataset.demo);n=event.key==='Home'?0:event.key==='End'?2:(n+(event.key==='ArrowRight'?1:2))%3;const b=app.querySelector(`[data-demo="${n}"]`);b.click();b.focus();
  });
  render();
})();
