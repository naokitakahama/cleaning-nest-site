(function(){
  // ---------- 数量 ----------
  var qty = { normal: 0, selfclean: 0, business: 0, cassette: 0, outdoor: 0, mold: 0, drain: 0, combo2: 0, combo3: 0 };
  document.querySelectorAll('.qty-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      var target = btn.dataset.target;
      var delta = parseInt(btn.dataset.delta, 10);
      qty[target] = Math.max(0, qty[target] + delta);
      document.getElementById('qty-' + target + '-val').textContent = qty[target];
      computeAll();
    });
  });

  function computeBase(){
    var total = qty.normal * 8000 + qty.selfclean * 12000 + qty.business * 15000 + qty.cassette * 29800
      + qty.outdoor * 4000 + qty.mold * 3000 + qty.drain * 2500
      + qty.combo2 * 5000 + qty.combo3 * 7000;
    return total;
  }

  // ---------- 高所作業費（台ごと）・天吊り室外機の作業費 ----------
  function computeGrandTotal(){
    var total = computeBase();
    var highCount = document.querySelectorAll('.u-height[value="high"]:checked').length;
    total += highCount * 3000;
    var hangCount = document.querySelectorAll('.o-hang[value="hang"]:checked').length;
    total += hangCount * 3000;
    return total;
  }

  function computeAll(){
    var base = computeBase();
    var grand = computeGrandTotal();
    document.getElementById('total1').textContent = base.toLocaleString();
    document.getElementById('total2').textContent = grand.toLocaleString();
    document.getElementById('total2b').textContent = grand.toLocaleString();
  }
  computeAll();

  // ---------- ステップ遷移 ----------
  var stepPanels = {
    1: document.getElementById('step1'),
    2: document.getElementById('step2'),
    3: document.getElementById('step3')
  };
  var stepItems = document.querySelectorAll('.step-item');

  function goToStep(n){
    Object.keys(stepPanels).forEach(function(k){
      stepPanels[k].classList.toggle('active', parseInt(k,10) === n);
    });
    stepItems.forEach(function(el){
      el.classList.toggle('active', parseInt(el.dataset.step,10) <= n);
    });
    window.scrollTo({top:0, behavior:'smooth'});
  }

  document.getElementById('toStep2').addEventListener('click', function(){
    if(qty.normal === 0 && qty.selfclean === 0 && qty.business === 0 && qty.cassette === 0){
      document.getElementById('step1-error').style.display = 'block';
      return;
    }
    document.getElementById('step1-error').style.display = 'none';
    renderUnitCards();
    goToStep(2);
  });

  document.getElementById('backToStep1').addEventListener('click', function(){
    goToStep(1);
  });

  document.getElementById('restartBtn').addEventListener('click', function(){
    location.reload();
  });

  // ---------- 郵便番号 住所検索 ----------
  document.getElementById('zipSearchBtn').addEventListener('click', function(){
    var zipInput = document.getElementById('f-zip');
    var statusEl = document.getElementById('zipStatus');
    var raw = zipInput.value.replace(/[^0-9]/g, '');
    if(raw.length !== 7){
      statusEl.textContent = '郵便番号は7桁でご入力ください';
      statusEl.className = 'zip-status ng';
      return;
    }
    statusEl.textContent = '検索中…';
    statusEl.className = 'zip-status';
    fetch('https://zipcloud.ibsnet.co.jp/api/search?zipcode=' + raw)
      .then(function(res){ return res.json(); })
      .then(function(data){
        if(data.status === 200 && data.results && data.results.length > 0){
          var r = data.results[0];
          var address = r.address1 + r.address2 + r.address3;
          document.getElementById('f-address').value = address;
          statusEl.textContent = '✅ 住所を自動入力しました';
          statusEl.className = 'zip-status ok';
        } else {
          statusEl.textContent = '該当する住所が見つかりませんでした。手入力してください';
          statusEl.className = 'zip-status ng';
        }
      })
      .catch(function(){
        statusEl.textContent = '住所検索に失敗しました。手入力してください';
        statusEl.className = 'zip-status ng';
      });
  });

  // ---------- 台数分の設置情報カード（設置場所／型番／製造年／高さ） ----------
  var CURRENT_YEAR = new Date().getFullYear();
  var unitTypesConfig = [
    { key: 'normal', label: '通常壁掛けエアコン' },
    { key: 'selfclean', label: 'お掃除機能付きエアコン' },
    { key: 'business', label: '業務用壁掛けエアコン' },
    { key: 'cassette', label: '天カセエアコン' }
  ];
  var unitData = {};

  function getUnitsList(){
    var list = [];
    unitTypesConfig.forEach(function(t){
      for(var i = 1; i <= qty[t.key]; i++){
        list.push({ key: t.key, label: t.label, n: i, id: t.key + '-' + i });
      }
    });
    return list;
  }

  function saveCurrentUnitValues(){
    document.querySelectorAll('.unit-card').forEach(function(card){
      var id = card.dataset.unitId;
      var heightChecked = card.querySelector('.u-height:checked');
      unitData[id] = {
        location: card.querySelector('.u-location').value,
        model: card.querySelector('.u-model').value,
        year: card.querySelector('.u-year').value,
        height: heightChecked ? heightChecked.value : 'normal'
      };
    });
    document.querySelectorAll('.o-hang:checked').forEach(function(r){
      outdoorData[r.name] = r.value;
    });
  }

  // ---------- 室外機の設置方法（天吊りは作業費 ＋¥3,000） ----------
  // 室外機洗浄・おまとめ2点・おまとめ3点のどれにも室外機が含まれる
  var outdoorData = {};

  function getOutdoorCount(){
    return qty.outdoor + qty.combo2 + qty.combo3;
  }

  function renderOutdoorCard(){
    var n = getOutdoorCount();
    if(n === 0) return '';
    var rows = '';
    for(var i = 1; i <= n; i++){
      var name = 'hang-' + i;
      var v = outdoorData[name] || 'normal';
      rows += ''
        + '<label class="field-label">室外機 ' + i + '台目<span class="req">必須</span></label>'
        + '<div class="radio-pair">'
        + '<label><input type="radio" class="o-hang" name="' + name + '" value="normal"' + (v !== 'hang' ? ' checked' : '') + '> 地面・ベランダ置き（通常）</label>'
        + '<label><input type="radio" class="o-hang" name="' + name + '" value="hang"' + (v === 'hang' ? ' checked' : '') + '> 天吊り（作業費 ＋¥3,000）</label>'
        + '</div>';
    }
    return ''
      + '<div class="card outdoor-card">'
      + '<h2>🌀 室外機の設置方法</h2>'
      + '<p class="sub-note">天井や壁から吊り下げられている室外機は、作業費 ＋¥3,000 がかかります。</p>'
      + rows
      + '</div>';
  }

  function updateYearNote(card){
    var yearInput = card.querySelector('.u-year');
    var yearNote = card.querySelector('.u-year-note');
    var y = parseInt(yearInput.value, 10);
    if(!isNaN(y) && y >= 1990){
      var age = CURRENT_YEAR - y;
      if(age >= 10){
        yearNote.textContent = '⚠️ 製造から' + age + '年経過しています。保証対象外となる場合があります';
        yearNote.style.color = 'var(--danger)';
      } else {
        yearNote.textContent = '10年以上経過の場合は保証対象外となります';
        yearNote.style.color = 'var(--sub)';
      }
    } else {
      yearNote.textContent = '10年以上経過の場合は保証対象外となります';
      yearNote.style.color = 'var(--sub)';
    }
  }

  function attachUnitCardListeners(){
    document.querySelectorAll('.unit-card').forEach(function(card){
      var modelInput = card.querySelector('.u-model');
      var errModel = card.querySelector('.u-model-error');
      modelInput.addEventListener('input', function(){
        var halfWidthOk = /^[A-Za-z0-9\-\/ ]*$/.test(modelInput.value);
        if(!halfWidthOk){
          modelInput.classList.add('invalid');
          errModel.textContent = '型番は半角英数字・記号でご入力ください';
          errModel.classList.add('show');
        } else if(modelInput.value.trim() === ''){
          errModel.classList.remove('show');
        } else {
          modelInput.classList.remove('invalid');
          errModel.classList.remove('show');
        }
      });

      var yearInput = card.querySelector('.u-year');
      yearInput.addEventListener('input', function(){ updateYearNote(card); });
      updateYearNote(card);

      card.querySelectorAll('.u-height').forEach(function(r){
        r.addEventListener('change', computeAll);
      });
    });
  }

  function renderUnitCards(){
    saveCurrentUnitValues();
    var container = document.getElementById('unit-cards-wrap');
    var list = getUnitsList();
    var html = list.map(function(u){
      var d = unitData[u.id] || { location: '', model: '', year: '', height: 'normal' };
      return ''
        + '<div class="card unit-card" data-unit-id="' + u.id + '">'
        + '<h2>🌬️ ' + escapeHtml(u.label) + ' ' + u.n + '台目</h2>'
        + '<label class="field-label">設置場所<span class="req">必須</span></label>'
        + '<select class="u-location">'
        + '<option value="">選択してください</option>'
        + '<option value="リビング"' + (d.location === 'リビング' ? ' selected' : '') + '>リビング</option>'
        + '<option value="寝室"' + (d.location === '寝室' ? ' selected' : '') + '>寝室</option>'
        + '<option value="子供部屋"' + (d.location === '子供部屋' ? ' selected' : '') + '>子供部屋</option>'
        + '<option value="和室"' + (d.location === '和室' ? ' selected' : '') + '>和室</option>'
        + '</select>'
        + '<div class="field-error u-location-error">設置場所を選択してください</div>'
        + '<label class="field-label">型番（半角）<span class="req">必須</span></label>'
        + '<input type="text" class="u-model" placeholder="例：MSZ-GV2523" value="' + escapeHtml(d.model) + '">'
        + '<p class="sub-note">半角でご入力ください</p>'
        + '<div class="field-error u-model-error">型番をご入力ください（半角英数字・記号）</div>'
        + '<label class="field-label">製造年（西暦4桁）<span class="req">必須</span></label>'
        + '<input type="number" class="u-year" placeholder="例：2019" min="1990" max="2100" value="' + escapeHtml(d.year) + '">'
        + '<p class="sub-note u-year-note">10年以上経過の場合は保証対象外となります</p>'
        + '<div class="field-error u-year-error">製造年をご入力ください</div>'
        + '<label class="field-label">床からエアコン吹き出し口までの高さ<span class="req">必須</span></label>'
        + '<div class="radio-pair">'
        + '<label><input type="radio" class="u-height" name="height-' + u.id + '" value="normal"' + (d.height !== 'high' ? ' checked' : '') + '> 2.3m未満（通常）</label>'
        + '<label><input type="radio" class="u-height" name="height-' + u.id + '" value="high"' + (d.height === 'high' ? ' checked' : '') + '> 2.3m以上（高所作業費 ＋¥3,000）</label>'
        + '</div>'
        + '</div>';
    }).join('');
    container.innerHTML = html + renderOutdoorCard();
    attachUnitCardListeners();
    container.querySelectorAll('.o-hang').forEach(function(r){
      r.addEventListener('change', computeAll);
    });
    computeAll();
  }

  // ---------- 第1〜3希望 モード切り替え（いつでも/日付指定/曜日指定） ----------
  document.querySelectorAll('.pref-block').forEach(function(block){
    var modeRadios = block.querySelectorAll('.pref-mode');
    var dateWrap = block.querySelector('.pref-date-wrap');
    var daysWrap = block.querySelector('.pref-days-wrap');

    function updateModeUI(){
      var mode = block.querySelector('.pref-mode:checked').value;
      dateWrap.style.display = (mode === 'date') ? 'block' : 'none';
      daysWrap.style.display = (mode === 'days') ? 'block' : 'none';
    }
    modeRadios.forEach(function(r){
      r.addEventListener('change', updateModeUI);
    });
    updateModeUI();
  });

  // ---------- バリデーション ----------
  function setError(input, errorEl, isInvalid){
    if(isInvalid){
      input.classList.add('invalid');
      if(errorEl) errorEl.classList.add('show');
    } else {
      input.classList.remove('invalid');
      if(errorEl) errorEl.classList.remove('show');
    }
  }

  document.getElementById('reserveForm').addEventListener('submit', function(e){
    e.preventDefault();
    var firstInvalid = null;
    var ok = true;

    function check(input, condition, errorEl){
      var invalid = !condition;
      setError(input, errorEl, invalid);
      if(invalid){
        ok = false;
        if(!firstInvalid) firstInvalid = input;
      }
    }

    var name = document.getElementById('f-name');
    check(name, name.value.trim().length > 0, name.nextElementSibling);

    var tel = document.getElementById('f-tel');
    check(tel, /^[0-9\-]{9,15}$/.test(tel.value.trim()), tel.nextElementSibling);

    var email = document.getElementById('f-email');
    check(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()), email.nextElementSibling);

    var zip = document.getElementById('f-zip');
    check(zip, zip.value.replace(/[^0-9]/g,'').length === 7, document.getElementById('err-zip'));

    var address = document.getElementById('f-address');
    check(address, address.value.trim().length > 0, address.nextElementSibling);

    var banchi = document.getElementById('f-banchi');
    check(banchi, banchi.value.trim().length > 0, banchi.nextElementSibling);

    var parkingChecked = document.querySelectorAll('.parking-chk:checked').length > 0;
    var parkingFirst = document.getElementById('pk-1');
    setError(parkingFirst, document.getElementById('err-parking'), !parkingChecked);
    if(!parkingChecked){ ok = false; if(!firstInvalid) firstInvalid = parkingFirst; }

    document.querySelectorAll('.unit-card').forEach(function(card){
      var loc = card.querySelector('.u-location');
      check(loc, loc.value !== '', card.querySelector('.u-location-error'));

      var model = card.querySelector('.u-model');
      var modelOk = model.value.trim() !== '' && /^[A-Za-z0-9\-\/ ]+$/.test(model.value.trim());
      var modelErr = card.querySelector('.u-model-error');
      if(model.value.trim() === ''){ modelErr.textContent = '型番をご入力ください（半角英数字・記号）'; }
      else if(!modelOk){ modelErr.textContent = '型番は半角英数字・記号でご入力ください'; }
      check(model, modelOk, modelErr);

      var year = card.querySelector('.u-year');
      var y = parseInt(year.value, 10);
      var yearOk = year.value.trim() !== '' && !isNaN(y) && y >= 1990 && y <= 2100;
      check(year, yearOk, card.querySelector('.u-year-error'));
    });

    document.querySelectorAll('.pref-block').forEach(function(block){
      var mode = block.querySelector('.pref-mode:checked').value;
      var dateOk = true;
      var firstInvalidInBlock = null;
      if(mode === 'date'){
        dateOk = block.querySelector('.pref-date').value !== '';
        firstInvalidInBlock = block.querySelector('.pref-date');
      } else if(mode === 'days'){
        dateOk = block.querySelectorAll('.pref-days input:checked').length > 0;
        firstInvalidInBlock = block.querySelector('.pref-days input');
      }
      var dateErr = block.querySelector('.pref-date-error');
      dateErr.classList.toggle('show', !dateOk);
      if(!dateOk){ ok = false; if(!firstInvalid) firstInvalid = firstInvalidInBlock || block.querySelector('.pref-mode'); }

      var timeSelect = block.querySelector('.pref-time');
      var timeOk = timeSelect.value !== '';
      var timeErr = block.querySelector('.pref-time-error');
      setError(timeSelect, timeErr, !timeOk);
      if(!timeOk){ ok = false; if(!firstInvalid) firstInvalid = timeSelect; }
    });

    if(!ok){
      if(firstInvalid) firstInvalid.scrollIntoView({behavior:'smooth', block:'center'});
      return;
    }

    // ---------- 完了画面へ ----------
    var data = collectSummaryData();
    buildRecap(data);
    sendReservationEmail(data);
    goToStep(3);
  });

  function getPrefSummary(block){
    var mode = block.querySelector('.pref-mode:checked').value;
    if(mode === 'anytime') return 'いつでも';
    if(mode === 'date'){
      var d = block.querySelector('.pref-date').value;
      return d || '未選択';
    }
    var days = Array.prototype.map.call(block.querySelectorAll('.pref-days input:checked'), function(d){ return d.value; });
    return days.length ? days.join('・') + '曜日' : '未選択';
  }

  function collectSummaryData(){
    var blocks = document.querySelectorAll('.pref-block');
    var pref1 = getPrefSummary(blocks[0]) + '（' + (blocks[0].querySelector('.pref-time').value || '未選択') + '）';
    var pref2 = getPrefSummary(blocks[1]) + '（' + (blocks[1].querySelector('.pref-time').value || '未選択') + '）';
    var pref3 = getPrefSummary(blocks[2]) + '（' + (blocks[2].querySelector('.pref-time').value || '未選択') + '）';

    var pay = [];
    if(document.getElementById('pay-cash').checked) pay.push('現金');
    if(document.getElementById('pay-card').checked) pay.push('クレジットカード');
    if(document.getElementById('pay-paypay').checked) pay.push('PayPay');

    var parkingLabels = [];
    if(document.getElementById('pk-1').checked) parkingLabels.push('駐車スペースあり');
    if(document.getElementById('pk-2').checked) parkingLabels.push('自家用車との入れ替えで対応可能');
    if(document.getElementById('pk-3').checked) parkingLabels.push('近隣に有料駐車場あり（別途実費）');
    if(document.getElementById('pk-4').checked) parkingLabels.push('駐車スペースなし・不明');

    var locationLines = [];
    var modelLines = [];
    var yearLines = [];
    var heightLines = [];
    document.querySelectorAll('.unit-card').forEach(function(card, i){
      var n = i + 1;
      var titleText = card.querySelector('h2').textContent.trim();
      var loc = card.querySelector('.u-location').value || '未選択';
      var model = card.querySelector('.u-model').value.trim() || '未入力';
      var year = card.querySelector('.u-year').value.trim() || '未入力';
      var highChecked = card.querySelector('.u-height:checked');
      var heightLabel = (highChecked && highChecked.value === 'high') ? '2.3m以上（高所作業費 +¥3,000）' : '2.3m未満（通常）';
      locationLines.push(n + '台目（' + titleText + '）：' + loc);
      modelLines.push(n + '台目：' + model);
      yearLines.push(n + '台目：' + year + '年');
      heightLines.push(n + '台目：' + heightLabel);
    });
    // 室外機の設置方法はシートの「高さ」欄にまとめて記録する
    for(var oi = 1; oi <= getOutdoorCount(); oi++){
      var hangChecked = document.querySelector('.o-hang[name="hang-' + oi + '"]:checked');
      var hangLabel = (hangChecked && hangChecked.value === 'hang') ? '天吊り（作業費 +¥3,000）' : '地面・ベランダ置き（通常）';
      heightLines.push('室外機' + oi + '台目：' + hangLabel);
    }

    return {
      name: document.getElementById('f-name').value.trim(),
      tel: document.getElementById('f-tel').value.trim(),
      email: document.getElementById('f-email').value.trim(),
      zip: document.getElementById('f-zip').value.trim(),
      address: document.getElementById('f-address').value.trim(),
      banchi: document.getElementById('f-banchi').value.trim(),
      building: document.getElementById('f-building').value.trim(),
      pref1: pref1, pref2: pref2, pref3: pref3,
      pay: pay,
      parkingLabels: parkingLabels,
      heightLabel: heightLines.join('\n') || '未選択',
      location: locationLines.join('\n') || '未選択',
      model: modelLines.join('\n') || '未入力',
      year: yearLines.join('\n') || '未入力',
      notes: document.getElementById('f-notes').value.trim() || 'なし',
      qtyNormal: qty.normal,
      qtySelfclean: qty.selfclean,
      qtyBusiness: qty.business,
      qtyCassette: qty.cassette,
      grand: computeGrandTotal()
    };
  }

  function buildRecap(data){
    var html = '';
    html += '<div>👤 お名前：<b>' + escapeHtml(data.name) + '</b></div>';
    html += '<div>📞 電話番号：<b>' + escapeHtml(data.tel) + '</b></div>';
    html += '<div>📧 メール：<b>' + escapeHtml(data.email) + '</b></div>';
    html += '<div>📍 ご住所：<b>〒' + escapeHtml(data.zip) + ' ' + escapeHtml(data.address) + ' ' + escapeHtml(data.banchi) + ' ' + escapeHtml(data.building) + '</b></div>';
    html += '<div>📅 第1希望：<b>' + escapeHtml(data.pref1) + '</b></div>';
    html += '<div>📅 第2希望：<b>' + escapeHtml(data.pref2) + '</b></div>';
    html += '<div>📅 第3希望：<b>' + escapeHtml(data.pref3) + '</b></div>';
    html += '<div>💳 お支払い方法：<b>' + (data.pay.length ? escapeHtml(data.pay.join('・')) : '未選択') + '</b></div>';
    html += '<div>💰 概算お見積り金額：<b>¥' + data.grand.toLocaleString() + '</b></div>';

    document.getElementById('recap').innerHTML = html;
  }

  // ---------- 予約リクエストの記録＆メール通知（Google Apps Script経由） ----------
  var GAS_ENDPOINT_URL = 'https://script.google.com/macros/s/AKfycbyxPSvARbZRycvQbP8S8nHrv2MvzbyoXKraMHPWVhcVHJs0Co0nR0x1BdM5gFybvsk/exec';

  function sendReservationEmail(data){
    var payload = {
      name: data.name,
      tel: data.tel,
      email: data.email,
      zip: data.zip,
      address: data.address + ' ' + data.banchi + (data.building ? ' ' + data.building : ''),
      qtyNormal: data.qtyNormal,
      qtySelfclean: data.qtySelfclean,
      qtyBusiness: data.qtyBusiness,
      qtyCassette: data.qtyCassette,
      location: data.location,
      model: data.model,
      year: data.year,
      heightLabel: data.heightLabel,
      parking: data.parkingLabels.length ? data.parkingLabels.join('・') : '未選択',
      pref1: data.pref1,
      pref2: data.pref2,
      pref3: data.pref3,
      pay: data.pay.length ? data.pay.join('・') : '未選択',
      notes: data.notes,
      grand: data.grand,
      // スプレッドシート分析用（画面表示には影響なし）
      qtyOutdoor: qty.outdoor,
      qtyMold: qty.mold,
      qtyDrain: qty.drain,
      qtyCombo2: qty.combo2,
      qtyCombo3: qty.combo3,
      notify: document.getElementById('f-notify').checked,
      source: getTrafficSource(),
      device: /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent) ? 'スマホ' : 'PC'
    };

    fetch(GAS_ENDPOINT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).catch(function(err){
      console.error('予約データの送信に失敗しました', err);
    });
  }

  function getTrafficSource(){
    try {
      var utm = new URLSearchParams(location.search).get('utm_source');
      if(utm) return utm;
      if(document.referrer){
        var ref = new URL(document.referrer);
        if(ref.hostname !== location.hostname) return ref.hostname;
        // ホームページ内（トップ・/lp/・/area/〇〇/）から来た場合は、どのページかを残す
        if(ref.pathname.indexOf('/yoyaku/') !== 0) return ref.hostname + ref.pathname;
      }
    } catch(e){}
    return '直接';
  }

  function escapeHtml(str){
    return String(str || '').replace(/[&<>"']/g, function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
  }

})();
