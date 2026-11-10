(() => {
  'use strict';
  const C = window.COURSE;
  const app = document.getElementById('app');
  if (!C || !Array.isArray(C.lessons) || !C.lessons.length) {
    app.innerHTML = '<main id="main" class="intro"><h1>Не удалось загрузить материал</h1><p>Обновите страницу. Если это не помогло, попробуйте открыть сайт позже.</p></main>';
    return;
  }
  const KEY = 'ennera-gigachat-practice-v1';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fresh = () => ({version:C.version,started:false,view:'intro',current:0,progress:{},finalPractice:false});
  let state = fresh();
  let storageOK = true;
  let demo = 0;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.version === C.version && typeof data.progress === 'object' && data.progress !== null) {
        state.started = data.started === true;
        state.view = ['intro','lesson','finish'].includes(data.view) ? data.view : 'intro';
        state.current = Number.isInteger(data.current) && data.current >= 0 && data.current < C.lessons.length ? data.current : 0;
        state.finalPractice = data.finalPractice === true;
        for (const lesson of C.lessons) {
          const p = data.progress[lesson.id];
          if (!p || typeof p !== 'object') continue;
          const selected = Number.isInteger(p.selected) && p.selected >= 0 && p.selected < lesson.question.options.length ? p.selected : null;
          const attempts = Number.isSafeInteger(p.attempts) && p.attempts >= 0 ? p.attempts : 0;
          state.progress[lesson.id] = {
            practice:p.practice === true, correct:p.correct === true && selected === lesson.question.correct && attempts > 0,
            selected, attempts, firstTry:p.firstTry === true && attempts === 1,
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
  const completed = () => C.lessons.filter(l => progress(l).practice && progress(l).correct).length;
  const allDone = () => completed() === C.lessons.length;
  if (state.view === 'finish' && !allDone()) state.view = 'lesson';
  if (!allDone()) state.finalPractice = false;
  function save() {
    if (!storageOK) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { storageOK = false; document.getElementById('storage-warning').hidden = false; }
  }
  document.getElementById('storage-warning').hidden = storageOK;
  function announce(message) { document.getElementById('announcer').textContent = message; }
  const promptBox = (prompt, id = 'lesson-prompt') => prompt ? `<div class="prompt-box"><div class="prompt-head"><span>Запрос для ГигаЧата</span><button class="copy-button" data-copy="${id}">Скопировать</button></div><pre id="${id}" tabindex="0">${esc(prompt)}</pre></div>` : '';
  const checkList = items => `<ul class="checklist">${(items || []).map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
  function sidebar() {
    const n = completed();
    return `<aside class="sidebar" aria-label="Программа практикума"><div class="sidebar-title">Ваш маршрут</div><div class="progress-label"><span id="progress-text">Пройдено ${n} из ${C.lessons.length} шагов</span><span id="progress-percent">${Math.round(n/C.lessons.length*100)}%</span></div><div class="progress" role="progressbar" aria-label="Пройденные шаги" aria-valuemin="0" aria-valuemax="${C.lessons.length}" aria-valuenow="${n}"><span style="width:${n/C.lessons.length*100}%"></span></div><ol class="roadmap">${C.lessons.map((l,i) => { const p=progress(l); const done=p.practice&&p.correct; return `<li><button class="nav-step ${done?'complete':''}" data-lesson="${i}" ${state.view==='lesson'&&state.current===i?'aria-current="step"':''} aria-label="Шаг ${i+1}. ${esc(l.shortTitle || l.title)}${done?'. Пройден':''}"><span class="nav-number" aria-hidden="true">${done?'✓':String(i+1).padStart(2,'0')}</span><span class="nav-name">${esc(l.shortTitle || l.title)}</span></button></li>`;}).join('')}<li><button class="nav-step" data-action="finish" ${state.view==='finish'?'aria-current="step"':''} ${allDone()?'':'disabled'} aria-label="Итоговая практика${allDone()?'':'. Откроется после пяти шагов'}"><span class="nav-number" aria-hidden="true">↗</span><span class="nav-name">Итоговая практика</span></button></li></ol><div class="sidebar-bottom"><p>Можно сделать паузу.<br>Прогресс сохранится в этом браузере.</p><button class="text-button" data-action="home">О практикуме</button></div></aside>`;
  }
  function intro() {
    return `<main id="main" class="intro"><section class="hero"><div class="hero-copy"><div class="eyebrow">Практикум для сотрудников</div><h1 tabindex="-1">${esc(C.title)}</h1><p>${esc(C.subtitle)}</p><div class="hero-meta"><span class="meta-item"><i class="meta-dot"></i>25–30 минут</span><span class="meta-item"><i class="meta-dot"></i>${C.lessons.length} шагов</span><span class="meta-item"><i class="meta-dot"></i>Без опыта с ИИ</span></div><div class="button-row"><button class="button primary" data-action="start">${state.started?'Продолжить практикум':'Начать практикум'} <span aria-hidden="true">→</span></button>${state.started?`<span class="small muted">Пройдено ${completed()} из ${C.lessons.length}</span>`:''}</div><p class="hero-action-note">Откройте ГигаЧат в соседней вкладке. Если входите впервые, заложите ещё несколько минут. Регистрация на этом учебном сайте не нужна.</p></div><div class="illustration" aria-label="Учебный пример диалога"><div class="illustration-top"><span>Одна задача. По шагам.</span><i aria-hidden="true"></i></div><div class="chat-demo user"><div class="chat-person">Вы</div><p>Напиши коллеге: встреча переносится с 10:00 на 11:00. Попроси подтвердить участие.</p></div><div class="chat-demo"><div class="chat-person">Черновик ответа</div><p>Здравствуйте! Встреча переносится с 10:00 на 11:00. Подтвердите, пожалуйста, сможете ли участвовать.</p><div class="demo-tags"><span>Уточнить детали</span><span>Проверить факты</span></div></div><p class="illustration-caption">Учебный пример, не ответ ГигаЧата</p></div></section><section class="intro-strip" aria-label="Как будем учиться"><div><strong>Сначала — понятный пример</strong><p>Одна рабочая ситуация связывает все шаги.</p></div><div><strong>Потом — ваше действие</strong><p>Попробуете запрос и сравните результат.</p></div><div><strong>В конце — вопрос с разбором</strong><p>Ошибиться можно. Объясним и дадим попробовать ещё.</p></div></section><section><div class="section-heading"><h2>Что вы сделаете</h2><p>От первого сообщения до проверенного результата</p></div><div class="lesson-preview-list">${C.lessons.map((l,i)=>`<div class="lesson-preview"><span class="number">${String(i+1).padStart(2,'0')}</span><h3>${esc(l.shortTitle||l.title)}</h3><p>${esc(l.minutes)} мин</p></div>`).join('')}</div></section><section class="walkthrough"><div><h3>Как проходит практика</h3><p>Не нужно запоминать специальные команды. Объясняйте задачу обычными словами — и уточняйте, что нужно изменить.</p></div><div><div class="demo-controls" role="tablist" aria-label="Пример работы с запросом">${['Запрос','Ответ','Проверка'].map((s,i)=>`<button role="tab" id="demo-tab-${i}" aria-controls="demo-panel" class="demo-tab" data-demo="${i}" aria-selected="${demo===i}" tabindex="${demo===i?0:-1}">${i+1}. ${s}</button>`).join('')}</div><div class="demo-panel" id="demo-panel" role="tabpanel" aria-labelledby="demo-tab-${demo}">${demoContent()}</div></div></section><div class="before-start"><span class="note-icon" aria-hidden="true">↗</span><p><strong>Перед началом.</strong> Нужен браузер и доступ к <a href="https://giga.chat/" target="_blank" rel="noopener noreferrer">ГигаЧату</a>. Если сервис попросит войти, выполните вход на его странице. В практикуме используйте только вымышленные данные из заданий.</p></div><details class="access-help"><summary>Если ГигаЧат не открывается или непонятно, что нажать</summary><p>Проверьте соединение с интернетом и попробуйте обновить страницу ГигаЧата. Сервис может предложить войти; следуйте подсказкам на его официальной странице. Возможны ограничения сети или временная недоступность сервиса.</p><p>Загляните в <a href="https://giga.chat/help/articles/how-to-start-work-with-gigachat" target="_blank" rel="noopener noreferrer">официальную инструкцию по началу работы ↗</a>. Если доступ пока получить не удалось, вернитесь к практике позже. Просмотр учебного примера не заменяет самостоятельное упражнение.</p><p><strong>Как вернуться сюда:</strong> вкладка «Рабочий день с ГигаЧатом» остаётся открыта — нажмите на неё в верхней части браузера. <strong>Новый чат:</strong> найдите кнопку или значок нового чата в интерфейсе ГигаЧата.</p></details></main>`;
  }
  function demoContent() {
    return [
      '<p>«Напиши коллеге короткое сообщение: встреча переносится с 10:00 на 11:00. Попроси подтвердить участие».</p><small>Вы задали действие, точные факты и желаемый результат.</small>',
      '<p>«Привет! Встреча переносится с 10:00 на 11:00. Подтверди, пожалуйста, сможешь ли участвовать».</p><small>Учебный пример, не ответ ГигаЧата. В вашем диалоге формулировка может отличаться.</small>',
      '<p>Время указано верно? Просьба подтвердить участие есть? Лишних обещаний нет? Теперь текст можно использовать.</p><small>Если нужно, напишите следом: «Сделай обращение более официальным».</small>'
    ][demo];
  }
  function lessonHTML() {
    const l=C.lessons[state.current]; const p=progress(l);
    return `<article class="lesson"><div class="lesson-meta"><span>Шаг ${state.current+1} из ${C.lessons.length}</span><span class="pill">${esc(l.minutes)} мин</span></div><div class="eyebrow">${esc(l.kicker)}</div><h1 tabindex="-1">${esc(l.title)}</h1><p class="lesson-lead">${esc(l.lead)}</p><div class="story"><div class="story-label">Ваша рабочая ситуация</div><p>${esc(l.story)}</p></div><div class="lesson-body">${l.paragraphs.map(t=>`<p>${esc(t)}</p>`).join('')}</div>${l.key?`<div class="key-note"><h3>${esc(l.key.title)}</h3><p>${esc(l.key.text)}</p></div>`:''}${l.example?`<section class="example"><div class="example-label">${esc(l.example.label)}</div><div class="example-columns"><div class="example-cell"><strong>Обратите внимание</strong><p>${esc(l.example.before)}</p></div><div class="example-cell good"><strong>Как сделать лучше</strong><p>${esc(l.example.after)}</p></div></div>${l.example.note?`<p class="example-note">${esc(l.example.note)}</p>`:''}</section>`:''}<section class="practice" aria-labelledby="practice-heading"><div class="section-label">Теперь попробуйте</div><h2 id="practice-heading">Практика в ГигаЧате</h2><ol>${l.practice.map(t=>`<li>${esc(t)}</li>`).join('')}</ol>${promptBox(l.prompt)}${l.id==='refine'?'<p class="small muted">Вернитесь во вкладку ГигаЧата с вашим письмом и вставьте уточнение под его ответом. Новый чат на этом шаге не нужен.</p>':'<a class="external-link" href="https://giga.chat/" target="_blank" rel="noopener noreferrer">Открыть ГигаЧат ↗<span class="sr-only"> в новой вкладке</span></a>'}<p class="checklist-title">Проверьте свой результат</p>${checkList(l.checklist)}<label class="done-label"><input type="checkbox" id="practice-done" ${p.practice?'checked':''}><span>Я выполнил(а) упражнение и проверил(а) результат<small>Отметьте после работы в ГигаЧате. Сайт не видит ваш диалог.</small></span></label></section><section class="quiz" aria-labelledby="quiz-heading"><div class="section-label">Закрепим на примере</div><h2 id="quiz-heading">Один вопрос по ситуации</h2><form id="quiz-form"><fieldset><legend>${esc(l.question.text)}</legend><div class="answers">${l.question.options.map((o,i)=>`<label class="answer"><input type="radio" name="answer" value="${i}" ${p.selected===i?'checked':''} ${p.correct?'disabled':''}><span><span class="answer-letter">${['А','Б','В','Г'][i]}.</span> ${esc(o.text)}</span></label>`).join('')}</div></fieldset><div class="quiz-actions"><button class="button secondary" id="check-answer" type="submit" ${p.selected===null||p.correct||p.feedbackShown?'disabled':''}>${p.correct?'Ответ верный ✓':'Проверить ответ'}</button><span class="quiz-hint">Один правильный ответ. Попытки не ограничены.</span></div></form><div id="quiz-feedback" ${p.feedbackShown?'':'hidden'}>${p.feedbackShown?feedback(l,p):''}</div></section><div class="lesson-bottom"><p class="next-help" id="next-help">${nextHelp(p)}</p><div class="button-row">${state.current>0?'<button class="back-button" data-action="previous">← Назад</button>':''}<button class="button primary" id="next-lesson" data-action="next" ${p.practice&&p.correct?'':'disabled'}>${state.current===C.lessons.length-1?'К итоговой практике':'Следующий шаг'} <span aria-hidden="true">→</span></button></div></div></article>`;
  }
  const nextHelp = p => p.practice&&p.correct?'Шаг пройден. Можно двигаться дальше.':!p.practice&&!p.correct?'Чтобы продолжить, выполните практику и ответьте на вопрос.':!p.practice?'Осталось выполнить практику и отметить результат.':'Осталось выбрать верный ответ. Разбор поможет разобраться.';
  const feedback = (l,p) => `<div class="feedback ${p.correct?'':'wrong'}" role="status"><strong>${p.correct?'Верно. Вот почему':'Давайте разберёмся'}</strong><p>${esc(l.question.options[p.selected].feedback)}</p>${p.correct?'':'<p class="small" style="margin-top:10px">Выберите другой вариант и снова нажмите «Проверить ответ».</p>'}</div>`;
  function finishHTML() {
    const first=C.lessons.filter(l=>progress(l).firstTry).length;
    const f=C.finalTask;
    return `<article class="lesson"><div class="completion-banner"><div class="eyebrow">${state.finalPractice?'Практикум завершён':'Последнее небольшое задание'}</div><h1 tabindex="-1">${state.finalPractice?'Теперь у вас есть первый опыт':'Пять шагов пройдены'}</h1><p>${state.finalPractice?'Вы попробовали ставить задачу, уточнять ответ и проверять результат. Эти навыки пригодятся при знакомстве с рабочими ИИ-инструментами.':'Попробуйте применить всё вместе — без готового ответа. Это поможет закрепить навык.'}</p></div><div class="result-stats"><div><strong>${C.lessons.length}/${C.lessons.length}</strong><span>шагов с практикой</span></div><div><strong>${first}/${C.lessons.length}</strong><span>ответов с первой попытки</span></div><div><strong>${state.finalPractice?'✓':'→'}</strong><span>${state.finalPractice?'итоговая практика выполнена':'итоговая практика впереди'}</span></div></div><section class="practice final-task" aria-labelledby="final-title"><div class="section-label">Самостоятельная практика</div><h2 id="final-title">${esc(f.title)}</h2><p>${esc(f.text)}</p>${f.prompt?`<details class="hint"><summary>Нужна подсказка?</summary><p>${esc(f.prompt)}</p></details>`:''}<a class="external-link" href="https://giga.chat/" target="_blank" rel="noopener noreferrer">Открыть ГигаЧат ↗</a><p class="checklist-title">Проверьте себя</p>${checkList(f.checklist)}<label class="done-label"><input type="checkbox" id="final-done" ${state.finalPractice?'checked':''}><span>Я выполнил(а) итоговое задание<small>Это самостоятельная проверка. Ответ из ГигаЧата оцениваете вы.</small></span></label></section><section><h2>Что вы уже попробовали</h2><ul class="result-list">${C.lessons.map(l=>`<li><span aria-hidden="true">✓</span>${esc(l.shortTitle||l.title)}</li>`).join('')}</ul><p class="result-note">Ошибки в вопросах — часть обучения. Важнее разобраться в объяснениях и попробовать действие самостоятельно. Результат — памятка о прохождении, а не аттестация. Файл можно передать тренеру вручную; автоматически результаты никому не отправляются.</p><div class="button-row report-actions"><button class="button primary" data-action="download" ${state.finalPractice?'':'disabled'}>Скачать результат ↓</button><button class="button secondary" data-action="print" ${state.finalPractice?'':'disabled'}>Распечатать</button></div>${!state.finalPractice?'<p class="small muted" style="margin-top:12px">Результат можно сохранить после итоговой практики.</p>':''}</section><div class="next-stage"><h3>Следующий шаг — рабочая система</h3><p>В корпоративной системе вы будете применять тот же подход: объяснить задачу, дать нужные сведения и проверить результат. Порядок работы с внутренними данными и доступными помощниками разберём отдельно на обучении.</p></div><div class="print-only"><h2>Памятка</h2><p>Объясните задачу → добавьте исходные сведения → задайте формат → уточните ответ → проверьте факты.</p><p>Практика отмечена самим участником. Результат не является сертификатом или подтверждением квалификации.</p></div><button class="text-button" data-lesson="0">Вернуться к первому шагу</button><button class="reset-link" data-action="reset">Сбросить прогресс и пройти заново</button></article>`;
  }
  function render(focus=false) {
    app.innerHTML = state.view==='intro' ? intro() : `<div class="learning-layout">${sidebar()}<main id="main">${state.view==='finish'?finishHTML():lessonHTML()}</main></div>`;
    if(focus) { window.scrollTo({top:0,behavior:'instant'}); app.querySelector('h1')?.focus({preventScroll:true}); }
    save();
  }
  function updateLessonControls() {
    const p=progress(C.lessons[state.current]);
    document.getElementById('next-lesson').disabled = !(p.practice&&p.correct);
    document.getElementById('next-help').textContent=nextHelp(p);
    const old=app.querySelector('.sidebar');
    old.outerHTML=sidebar();
  }
  function report() {
    return ['ЭННЕРА — Рабочий день с ГигаЧатом','Самостоятельный вводный практикум','',`Дата сохранения: ${new Date().toLocaleDateString('ru-RU')}`,`Пройдено шагов: ${completed()} из ${C.lessons.length}`,`Верно с первой попытки: ${C.lessons.filter(l=>progress(l).firstTry).length} из ${C.lessons.length}`,'Итоговая практика: отмечена как выполненная участником','',...C.lessons.map((l,i)=>`${i+1}. ${l.title} — практика отмечена, вопрос разобран (попыток: ${progress(l).attempts})`),'','Памятка: объясните задачу, добавьте исходные сведения, задайте формат, уточните ответ, проверьте факты.','','Результат основан на ответах в тестах и самостоятельных отметках участника. Сайт не проверяет диалоги в ГигаЧате. Это не аттестация и не сертификат.','Материал подготовлен с опорой на темы курса Нетологии: https://netology.ru/programs/bpgigachat'].join('\n');
  }
  document.addEventListener('click',async event=>{
    const target=event.target.closest('button,a[data-action]');
    if(!target || target.disabled) return;
    if(target.dataset.copy) {
      const el=document.getElementById(target.dataset.copy);
      try { await navigator.clipboard.writeText(el.textContent); target.textContent='Скопировано ✓'; announce('Запрос скопирован. Перейдите в ГигаЧат и вставьте его в поле сообщения.'); }
      catch { const range=document.createRange(); range.selectNodeContents(el); const selection=window.getSelection(); selection.removeAllRanges(); selection.addRange(range); target.textContent='Нажмите Ctrl+C'; announce('Не удалось скопировать автоматически. Текст выделен: нажмите Ctrl+C или используйте меню копирования.'); }
      return;
    }
    if(target.dataset.demo !== undefined) { demo=Number(target.dataset.demo); app.querySelectorAll('[data-demo]').forEach(b=>{const active=Number(b.dataset.demo)===demo;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;}); const panel=document.getElementById('demo-panel'); panel.innerHTML=demoContent(); panel.setAttribute('aria-labelledby',`demo-tab-${demo}`); return; }
    if(target.dataset.lesson !== undefined) { state.started=true; state.current=Number(target.dataset.lesson); state.view='lesson'; render(true); return; }
    switch(target.dataset.action) {
      case 'home': event.preventDefault(); state.view='intro'; render(true); break;
      case 'start': state.started=true; state.view=allDone()?'finish':'lesson'; if(!allDone()) state.current=C.lessons.findIndex(l=>!(progress(l).practice&&progress(l).correct)); render(true); break;
      case 'previous': state.current=Math.max(0,state.current-1); render(true); break;
      case 'next': { const p=progress(C.lessons[state.current]); if(!(p.practice&&p.correct)) return; if(state.current<C.lessons.length-1) state.current++; else if(allDone()) state.view='finish'; else state.current=C.lessons.findIndex(l=>!(progress(l).practice&&progress(l).correct)); render(true); break; }
      case 'finish': if(allDone()) {state.view='finish';render(true);} break;
      case 'download': if(allDone()&&state.finalPractice) {const url=URL.createObjectURL(new Blob(['\ufeff'+report()],{type:'text/plain;charset=utf-8'})); const a=document.createElement('a');a.href=url;a.download='gigachat-practice-result.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('Результат сохранён в текстовый файл.');} break;
      case 'print': if(allDone()&&state.finalPractice) window.print(); break;
      case 'reset': if(window.confirm('Сбросить только прогресс этого практикума в этом браузере? Ответы и отметки придётся заполнить заново.')) { state=fresh(); render(true); announce('Прогресс практикума сброшен.'); } break;
    }
  });
  document.addEventListener('change',event=>{
    const target=event.target;
    if(target.id==='practice-done') { const p=progress(C.lessons[state.current]);p.practice=target.checked;if(!allDone())state.finalPractice=false;save();updateLessonControls();announce(p.practice?'Практика отмечена как выполненная.':'Отметка о практике снята.'); }
    if(target.name==='answer') { const p=progress(C.lessons[state.current]);if(p.correct)return;p.selected=Number(target.value);p.feedbackShown=false;save();document.getElementById('quiz-feedback').hidden=true;document.getElementById('check-answer').disabled=false; }
    if(target.id==='final-done') { state.finalPractice=target.checked;save();render(false);document.getElementById('final-done')?.focus({preventScroll:true});announce(state.finalPractice?'Итоговая практика отмечена. Можно сохранить результат.':'Отметка итоговой практики снята.'); }
  });
  document.addEventListener('submit',event=>{
    if(event.target.id!=='quiz-form')return;event.preventDefault();const l=C.lessons[state.current];const p=progress(l);if(p.selected===null||p.correct||p.feedbackShown)return;p.attempts++;p.correct=p.selected===l.question.correct;p.firstTry=p.correct&&p.attempts===1;p.feedbackShown=true;save();const region=document.getElementById('quiz-feedback');region.hidden=false;region.innerHTML=feedback(l,p);const button=document.getElementById('check-answer');button.disabled=true;if(p.correct){button.textContent='Ответ верный ✓';event.target.querySelectorAll('input').forEach(el=>el.disabled=true);}updateLessonControls();
  });
  document.addEventListener('keydown',event=>{
    const target=event.target.closest('[data-demo]');if(!target||!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;event.preventDefault();let n=Number(target.dataset.demo);n=event.key==='Home'?0:event.key==='End'?2:(n+(event.key==='ArrowRight'?1:2))%3;const b=app.querySelector(`[data-demo="${n}"]`);b.click();b.focus();
  });
  render();
})();
