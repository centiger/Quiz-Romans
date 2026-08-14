
const $ = s => document.querySelector(s);
let quiz = [], pos = 0, answers = {}, checked = {};
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');

function filteredBank(){
  const t=$('#typeFilter').value,d=$('#difficultyFilter').value,c=$('#chapterFilter').value;
  return QUESTION_BANK.filter(q=>((t==='전체')||(t==='빈칸형'&&q.subtype==='빈칸형')||(t==='주관식'&&q.type==='주관식')||q.type===t)&&(d==='전체'||q.difficulty===d)&&(c==='전체'||String(q.chapter)===c));
}
function shuffle(a){ a=[...a]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

$('#startBtn').addEventListener('click',()=>{
  let pool=filteredBank();
  if(!pool.length){ alert('조건에 맞는 문항이 없습니다.'); return; }
  const n=Math.max(1,Math.min(Number($('#countInput').value)||20,pool.length));
  if($('#randomize').checked) pool=shuffle(pool);
  quiz=pool.slice(0,n); pos=0; answers={}; checked={};
  $('#quizPanel').classList.remove('hidden'); $('#resultPanel').classList.add('hidden'); $('#bankPanel').classList.add('hidden');
  renderQuestion(); window.scrollTo({top:$('#quizPanel').offsetTop-12,behavior:'smooth'});
});
function renderQuestion(){
  const q=quiz[pos], ref=`롬 ${q.chapter}:${q.verse}`, saved=answers[q.id] ?? '';
  $('#progressText').textContent=`${pos+1} / ${quiz.length}`;
  $('#scoreText').textContent=`확인 ${Object.keys(checked).length}문항`;
  $('#progressBar').style.width=`${((pos+1)/quiz.length)*100}%`;
  let body=`<div class="meta"><span class="badge">${q.subtype==='빈칸형'?'빈칸형':q.type}</span><span class="badge">난이도 ${q.difficulty}</span>${$('#showRefDuring').checked?`<span class="badge">${ref}</span>`:''}</div><div class="qtext">${q.question}</div>`;
  if(q.type==='객관식'){
    body += q.choices.map((c,i)=>`<label class="choice"><input type="radio" name="choice" value="${i}" ${String(saved)===String(i)?'checked':''}>${i+1}. ${c}</label>`).join('');
  } else {
    body += `<textarea id="subjectiveAnswer" placeholder="답을 입력하세요.">${typeof saved==='string'?saved:''}</textarea>`;
  }
  if(checked[q.id]) body += feedbackHtml(q);
  $('#questionCard').innerHTML=body;
  $('#prevBtn').disabled=pos===0; $('#nextBtn').textContent=pos===quiz.length-1?'결과 보기':'다음';
}
function saveCurrent(){
  const q=quiz[pos];
  if(q.type==='객관식'){ const x=document.querySelector('input[name=choice]:checked'); if(x) answers[q.id]=Number(x.value); }
  else { const x=$('#subjectiveAnswer'); if(x) answers[q.id]=x.value.trim(); }
}
function normalize(s){return (s||'').toLowerCase().replace(/\s+/g,'').replace(/[.,·ㆍ:;!?'"“”‘’()\[\]{}]/g,'');}
function subjectScore(q, ans){
  const n=normalize(ans); if(!n) return 0;
  const hit=(q.keywords||[]).filter(k=>n.includes(normalize(k))).length;
  return hit/(q.keywords||[]).length;
}
function isCorrect(q){
  const a=answers[q.id];
  if(q.type==='객관식') return Number(a)===Number(q.answer);
  return subjectScore(q,a)>=0.6;
}
function feedbackHtml(q){
  const ok=isCorrect(q);
  let detail=q.type==='객관식'?`정답: ${Number(q.answer)+1}번 ${q.answerText}<br>${q.explanation}`:
    `예시답안: ${q.answerText}${q.rubric?`<br><span class="muted">채점기준: ${q.rubric}</span>`:''}<br><span class="muted">※ 주관식 자동 판정은 핵심어 기준의 참고용입니다.</span>`;
  return `<div class="feedback ${ok?'good':'bad'}"><b>${ok?'정답/핵심어 충족':'정답 확인'}</b><br>${detail}<br><span class="muted">성경 장절: 롬 ${q.chapter}:${q.verse}</span></div>`;
}
$('#checkBtn').addEventListener('click',()=>{ saveCurrent(); const q=quiz[pos]; checked[q.id]=true; renderQuestion(); });
$('#prevBtn').addEventListener('click',()=>{ saveCurrent(); if(pos>0){pos--;renderQuestion();}});
$('#nextBtn').addEventListener('click',()=>{ saveCurrent(); if(pos<quiz.length-1){pos++;renderQuestion();} else showResult();});
function showResult(){
  quiz.forEach(q=>{ if(answers[q.id]!==undefined) checked[q.id]=true; });
  let obj=quiz.filter(q=>q.type==='객관식'), sub=quiz.filter(q=>q.type==='주관식');
  let objOk=obj.filter(isCorrect).length, subOk=sub.filter(isCorrect).length, totalOk=objOk+subOk;
  let html=`<h2>퀴즈 결과</h2><div class="resultscore">${totalOk} / ${quiz.length}</div>
  <p>객관식 ${objOk}/${obj.length} · 주관식 핵심어 판정 ${subOk}/${sub.length}</p>
  <p class="muted">서술형 자동 판정은 참고용입니다. 예시답안과 채점기준을 확인해 최종 채점하세요.</p>
  <div class="actions"><button id="reviewBtn" class="primary">오답·정답 검토</button><button id="restartBtn">다시 풀기</button></div><div id="reviewArea"></div>`;
  $('#resultPanel').innerHTML=html; $('#resultPanel').classList.remove('hidden'); window.scrollTo({top:$('#resultPanel').offsetTop-12,behavior:'smooth'});
  $('#restartBtn').onclick=()=>$('#startBtn').click();
  $('#reviewBtn').onclick=()=>{
    $('#reviewArea').innerHTML=quiz.map(q=>`<div class="bankitem"><h3>${q.id} · ${q.subtype==='빈칸형'?'빈칸형':q.type} · 난이도 ${q.difficulty} · 롬 ${q.chapter}:${q.verse}</h3><div><b>문제:</b> ${q.question}</div><div><b>내 답:</b> ${q.type==='객관식' && answers[q.id]!==undefined ? `${Number(answers[q.id])+1}. ${q.choices[answers[q.id]]}` : (answers[q.id]||'무응답')}</div><div><b>정답/예시:</b> ${q.answerText}</div></div>`).join('');
  };
}
$('#showAllBtn').addEventListener('click',()=>{
  $('#bankPanel').classList.remove('hidden');
  $('#bankList').innerHTML=QUESTION_BANK.map(q=>`<div class="bankitem"><h3>${q.id} · ${q.subtype==='빈칸형'?'빈칸형':q.type}${q.type==='주관식'&&q.subtype!=='빈칸형'?`(${q.subtype})`:''} · 난이도 ${q.difficulty} · 롬 ${q.chapter}:${q.verse}</h3><div><b>문제:</b> ${q.question}</div>${q.type==='객관식'?`<ol>${q.choices.map(c=>`<li>${c}</li>`).join('')}</ol>`:''}<details><summary>정답 보기</summary><p>${q.type==='객관식'?`${Number(q.answer)+1}번 · `:''}${q.answerText}</p></details></div>`).join('');
  window.scrollTo({top:$('#bankPanel').offsetTop-12,behavior:'smooth'});
});
$('#hideAllBtn').addEventListener('click',()=>$('#bankPanel').classList.add('hidden'));

function download(filename, text, mime='text/plain;charset=utf-8'){
  const blob=new Blob(['\uFEFF'+text],{type:mime}); const a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function csvEscape(v){ v=String(v??''); return `"${v.replaceAll('"','""')}"`; }
function questionTxt(){
  return QUESTION_BANK.map((q,i)=>`${i+1}. [${q.type}${q.type==='주관식'?'/'+q.subtype:''}·${q.difficulty}] ${q.question}\n${q.type==='객관식'?q.choices.map((c,j)=>`   ${j+1}) ${c}`).join('\n')+'\n':''}`).join('\n');
}
function answerTxt(){
  return QUESTION_BANK.map((q,i)=>`${i+1}. ${q.type==='객관식'?`${Number(q.answer)+1}번 `:''}${q.answerText} (롬 ${q.chapter}:${q.verse})${q.rubric?`\n   채점기준: ${q.rubric}`:''}`).join('\n');
}
document.querySelectorAll('[data-download]').forEach(btn=>btn.addEventListener('click',()=>{
  const kind=btn.dataset.download;
  if(kind==='questions-txt') download('로마서_성경퀴즈_150문항_문제지.txt',questionTxt());
  if(kind==='answers-txt') download('로마서_성경퀴즈_150문항_정답지.txt',answerTxt());
  if(kind==='json') download('로마서_문제은행_120.json',JSON.stringify(QUESTION_BANK,null,2),'application/json;charset=utf-8');
  if(kind.includes('csv')){
    const answersMode=kind==='answers-csv';
    const rows=[answersMode?['번호','유형','세부유형','난이도','장절','정답/예시답안','채점기준']:['번호','유형','세부유형','난이도','장절','문제','선택지']];
    QUESTION_BANK.forEach((q,i)=>rows.push(answersMode?
      [i+1,q.type,q.subtype,q.difficulty,`롬 ${q.chapter}:${q.verse}`,q.type==='객관식'?`${Number(q.answer)+1}번 ${q.answerText}`:q.answerText,q.rubric||'']:
      [i+1,q.type,q.subtype,q.difficulty,`롬 ${q.chapter}:${q.verse}`,q.question,q.choices.join(' | ')]
    ));
    download(answersMode?'로마서_성경퀴즈_정답지.csv':'로마서_성경퀴즈_문제지.csv',rows.map(r=>r.map(csvEscape).join(',')).join('\n'),'text/csv;charset=utf-8');
  }
}));
