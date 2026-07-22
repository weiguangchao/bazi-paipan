(function () {
  "use strict";

  var form = document.getElementById("paipan-form");
  var dateInput = document.getElementById("date");
  var timeInput = document.getElementById("time");
  var genderSelect = document.getElementById("gender");
  var provinceSelect = document.getElementById("province");
  var citySelect = document.getElementById("city");
  var generalError = document.getElementById("general-error");
  var emptyState = document.getElementById("empty-state");

  // 默认值
  dateInput.value = "2000-01-01";
  timeInput.value = "12:00";

  var provinceCitiesCache = {};

  // 加载省份索引
  fetch("/cities/provinces.json")
    .then(function (r) { return r.json(); })
    .then(function (provinces) {
      provinces.forEach(function (p) {
        var opt = document.createElement("option");
        opt.value = p;
        opt.textContent = p;
        provinceSelect.appendChild(opt);
      });
      // 默认选 北京市
      provinceSelect.value = "北京市";
      loadCities("北京市").then(function () {
        citySelect.value = "市辖区";
      });
    });

  // 省份变化 -> 加载对应城市
  provinceSelect.addEventListener("change", function () {
    var prov = provinceSelect.value;
    if (prov) {
      citySelect.disabled = false;
      loadCities(prov).then(function () {
        citySelect.value = citySelect.options[0] ? citySelect.options[0].value : "";
      });
    } else {
      citySelect.disabled = true;
      citySelect.innerHTML = "";
      var opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "请先选择省份";
      citySelect.appendChild(opt);
      citySelect.value = "";
    }
    clearFieldError("province");
    clearFieldError("city");
  });

  citySelect.addEventListener("change", function () {
    clearFieldError("province");
    clearFieldError("city");
  });

  function loadCities(province) {
    if (provinceCitiesCache[province]) {
      populateCities(provinceCitiesCache[province]);
      return Promise.resolve();
    }
    return fetch("/cities/" + encodeURIComponent(province) + ".json")
      .then(function (r) { return r.json(); })
      .then(function (cities) {
        provinceCitiesCache[province] = cities;
        populateCities(cities);
      });
  }

  function populateCities(cities) {
    citySelect.innerHTML = "";
    cities.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      citySelect.appendChild(opt);
    });
  }

  // 清除字段错误
  function clearFieldError(field) {
    var el = document.querySelector(".field-error[data-field=\"" + field + "\"]");
    if (el) el.textContent = "";
    var fieldEl = document.getElementById(field);
    if (fieldEl && fieldEl.parentElement) {
      fieldEl.parentElement.classList.remove("has-error");
    }
  }

  function clearAllErrors() {
    document.querySelectorAll(".field-error").forEach(function (el) { el.textContent = ""; });
    document.querySelectorAll(".field").forEach(function (el) { el.classList.remove("has-error"); });
    generalError.hidden = true;
  }

  function showFieldError(field, message) {
    var el = document.querySelector(".field-error[data-field=\"" + field + "\"]");
    if (el) el.textContent = message;
    var fieldEl = document.getElementById(field);
    if (fieldEl && fieldEl.parentElement) {
      fieldEl.parentElement.classList.add("has-error");
    }
  }

  function showGeneralError(message) {
    generalError.textContent = message;
    generalError.hidden = false;
  }

  // 表单提交
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearAllErrors();

    var body = {
      date: dateInput.value,
      time: timeInput.value,
      gender: genderSelect.value,
      province: provinceSelect.value || "",
      city: citySelect.value || "",
    };

    fetch("/api/paipan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(function (res) {
        return res.json().then(function (json) {
          return { ok: res.ok, status: res.status, body: json };
        });
      })
      .then(function (result) {
        if (result.ok) {
          renderResult(result.body.data);
        } else {
          renderError(result.body.error);
        }
      })
      .catch(function () {
        showGeneralError("网络错误，请重试");
      });
  });

  function renderError(error) {
    var fields = error.fields || {};
    Object.keys(fields).forEach(function (f) {
      showFieldError(f, fields[f]);
    });
    showGeneralError(error.message || "排盘失败");
  }

  function renderResult(data) {
    emptyState.hidden = true;
    renderSizhu(data.sizhu);
    renderDayun(data.dayun);
  }

  function renderSizhu(sizhu) {
    var grid = document.getElementById("sizhu-grid");
    grid.innerHTML = "";
    var pillars = [
      { label: "年柱", data: sizhu.year },
      { label: "月柱", data: sizhu.month },
      { label: "日柱", data: sizhu.day },
      { label: "时柱", data: sizhu.hour },
    ];

    grid.className = "sizhu-table";
    grid.appendChild(createSizhuRow("日期", pillars, function (pillar) {
      return createTextCell("sizhu-column-label", pillar.label);
    }));
    grid.appendChild(createSizhuRow("主星", pillars, function (pillar) {
      return createTextCell("sizhu-shishen", pillar.data.shishen);
    }));
    grid.appendChild(createSizhuRow("天干", pillars, function (pillar) {
      return createWuxingCell("sizhu-gan", pillar.data.ganzhi.charAt(0));
    }));
    grid.appendChild(createSizhuRow("地支", pillars, function (pillar) {
      return createWuxingCell("sizhu-zhi", pillar.data.ganzhi.charAt(1));
    }));
    grid.appendChild(createSizhuRow("藏干", pillars, function (pillar) {
      return createCangganCell("sizhu-canggan", pillar.data.canggan, "tiangan");
    }));
    grid.appendChild(createSizhuRow("副星", pillars, function (pillar) {
      return createCangganCell("sizhu-fuxing", pillar.data.canggan, "shishen");
    }));
    document.getElementById("result-sizhu").hidden = false;
  }

  function createSizhuRow(label, pillars, createValueCell) {
    var row = document.createElement("div");
    row.className = "sizhu-row";
    row.appendChild(createTextCell("sizhu-row-label", label));
    pillars.forEach(function (pillar) {
      row.appendChild(createValueCell(pillar));
    });
    return row;
  }

  function createTextCell(className, value) {
    var cell = document.createElement("div");
    cell.className = "sizhu-cell " + className;
    cell.textContent = value;
    return cell;
  }

  function createWuxingCell(className, character) {
    var cell = createTextCell(className, character);
    cell.classList.add("element-" + getWuxing(character));
    return cell;
  }

  function createCangganCell(className, canggan, field) {
    var cell = document.createElement("div");
    cell.className = "sizhu-cell " + className;
    canggan.forEach(function (item) {
      var line = document.createElement("div");
      if (field === "tiangan") {
        line.className = "element-" + getWuxing(item.tiangan);
      }
      line.textContent = item[field];
      cell.appendChild(line);
    });
    return cell;
  }

  function getWuxing(character) {
    if ("甲乙寅卯".indexOf(character) !== -1) return "wood";
    if ("丙丁巳午".indexOf(character) !== -1) return "fire";
    if ("戊己辰戌丑未".indexOf(character) !== -1) return "earth";
    if ("庚辛申酉".indexOf(character) !== -1) return "metal";
    return "water";
  }

  function createPillarCard(label, pillar) {
    var card = document.createElement("div");
    card.className = "pillar-card";
    var tianganCharacter = pillar.ganzhi.charAt(0);
    var dizhiCharacter = pillar.ganzhi.charAt(1);
    var cangganString = (pillar.canggan || []).join(" ");
    card.innerHTML =
      '<div class="pillar-label">' + label + "</div>" +
      '<div class="pillar-gan">' + tianganCharacter + "</div>" +
      '<div class="pillar-shishen">' + (pillar.shishen || pillar.tianganShishen) + "</div>" +
      '<div class="pillar-zhi">' + dizhiCharacter + "</div>" +
      '<div class="pillar-canggan">' + cangganString + "</div>";
    return card;
  }

  function renderDayun(dayun) {
    var info = document.getElementById("dayun-info");
    info.textContent = "方向：" + dayun.direction + "行；起运 " + dayun.qiyun.ageYears + "岁" + dayun.qiyun.ageMonths + "月";
    var grid = document.getElementById("dayun-grid");
    grid.innerHTML = "";
    var selectedIndex = dayun.zhu.findIndex(function (zhu) {
      return zhu.liunian.some(function (item) { return item.isCurrentYear; });
    });
    if (selectedIndex < 0) selectedIndex = 0;
    dayun.zhu.forEach(function (zhu, i) {
      var card = createPillarCard("第" + (i + 1) + "柱", zhu);
      card.dataset.index = String(i);
      card.dataset.startYear = String(zhu.startYear);
      if (i === selectedIndex) card.classList.add("is-selected");
      var start = document.createElement("div");
      start.className = "pillar-start";
      start.textContent = zhu.qiyun.ageYears + "岁起；" + zhu.startYear + "年" + zhu.startMonth + "月";
      card.appendChild(start);
      grid.appendChild(card);
    });
    renderLiunian(dayun.zhu[selectedIndex].liunian);
    document.getElementById("result-dayun").hidden = false;
  }

  function renderLiunian(items) {
    var grid = document.getElementById("liunian-grid");
    grid.innerHTML = "";
    items.forEach(function (item) {
      var card = createPillarCard(String(item.year), item);
      grid.appendChild(card);
    });
    document.getElementById("result-liunian").hidden = false;
  }
})();
