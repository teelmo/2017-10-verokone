'use strict';
(($) => {
  require('easy-autocomplete');
  let plus;
  let plusApp = {
    formatNr: (x, addComma) => {
      x = x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '&nbsp;');
      x = x.replace('.', ',');
      if (addComma === true && x.indexOf(',') === -1) {
        x = x + ',0';
      }
      return (x === '') ? 0 : x;
    },
    roundNr: (x, d) => {
      return parseFloat(x.toFixed(d));
    },
    setPath: () => {
      if (location.href.match('dev')) {
        plusApp.path = 'http://dev.yle.fi/2017/' + plusApp.projectName + '/public/';
      }
      else if (location.href.match('yle.fi/plus')) {
        plusApp.path = '//yle.fi/plus/yle/2017/' + plusApp.projectName + '/';
      }
      else {
        plusApp.path = '//plus.yle.fi/' + plusApp.projectName + '/';
      }
    },
    capitalizeFirstLetter: (string) => {
      return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    },
    getScale: () => {
      let width = plus.width();
      if (width >= 600) {
        plus.addClass('wide');
        return true;
      }
      if (width < 600) {
        plus.removeClass('wide');
        return false;
      }
    },
    initMediaUrls: () => {
      $.each($('.handle_img', plus), (i, el) => {
        $(this).attr('src', plusApp.path + 'img/' + $(this).attr('data-src'));
      });
    },
    getData: () => {
      $.getJSON(plusApp.path + 'data/data.json', (data) => {
        plusApp.data = data;
        plusApp.municipalities = [];
        $.each(plusApp.data.municipalities, (municipality_id, municipality) => {
          plusApp.municipalities.push({
            id: municipality_id,
            name: municipality.name_fi
          });
        });
        plusApp.initAutocomplete();
      });
    },
    initAutocomplete: () => {
      let element = $('.municipality_input_init', plus);
      element.easyAutocomplete({
        data:plusApp.municipalities,
        getValue:'name',
        highlightPhrase: true,
        list:{
          hideAnimation:{
            callback: () => {},
            time:200,
            type:'slide'
          },
          match:{
            enabled:true
          },
          onKeyEnterEvent: () => {
            plusApp.municipality_id = element.getSelectedItemData().id;
          },
          maxNumberOfElements:10,
          onSelectItemEvent: () => {
            plusApp.municipality_id = element.getSelectedItemData().id;
          },
          showAnimation: {
            callback: function() {},
            time:200,
            type:'slide'
          }
        },
        placeholder: 'esimerkiksi Tampere'
      });
    },
    calculateTax: (tax_percent) => {
      plusApp.meta = $('<div class="meta_container"></div>');
      $('<h3>Lasketut vähennykset</h3>').appendTo(plusApp.meta);

      // Vuositulot.
      let vuositulot = plusApp.salary * 12;
      $('<div class="vuositulot"><span class="label">Vuositulot</span> <span class="value">' + plusApp.formatNr(plusApp.roundNr(vuositulot), 0) + ' €</span></div>').appendTo(plusApp.meta);
      let ansiotulot = vuositulot;

      // Tulonhankkimisvähennys
      let temp = (vuositulot > 750) ? 750 : vuositulot;
      $('<div class="deduction"><span class="label">Tulonhankkimisvähennys</span> <span class="value">' + plusApp.formatNr(plusApp.roundNr(temp), 0)  + ' €</span></div>').appendTo(plusApp.meta);
      ansiotulot = (vuositulot > 750) ? ansiotulot - temp : ansiotulot - temp;

      // Yle vero.
      let ylevero = (ansiotulot * 0.0068 < 70) ? 0 : Math.min(ansiotulot * 0.0068, 143); // 0.68%

      // Työeläkevakuutusmaksu.
      let tyoelakevakuutusmaksu = vuositulot * 0.0615; // 6.15%
      ansiotulot = ansiotulot - tyoelakevakuutusmaksu;
      $('<div class="deduction"><span class="label">Työeläkevakuutusmaksu</span> <span class="value">' + plusApp.formatNr(plusApp.roundNr(tyoelakevakuutusmaksu), 0) + ' €</span></div>').appendTo(plusApp.meta);

      // Työttömyysvakuutusmaksu.
      let tyottomyysvakuutusmaksu = vuositulot * 0.016; // 1.6%
      ansiotulot = ansiotulot - tyottomyysvakuutusmaksu;
      $('<div class="deduction"><span class="label">Työttömyysvakuutusmaksu</span> <span class="value">' + plusApp.formatNr(plusApp.roundNr(tyottomyysvakuutusmaksu), 0) + ' €</span></div>').appendTo(plusApp.meta);

      // Sairausvakuutuksen päivärahamaksu.
      let sairausvakuutuksen_paivarahamaksu = 0;
      if (vuositulot > 14000) {
        sairausvakuutuksen_paivarahamaksu = vuositulot * 0.0158; // 1.58%
        ansiotulot = ansiotulot - sairausvakuutuksen_paivarahamaksu;
        $('<div class="deduction"><span class="label">Sairausvakuutuksen päivärahamaksu</span> <span class="value">' + plusApp.formatNr(plusApp.roundNr(sairausvakuutuksen_paivarahamaksu), 0)  + ' €</span></div>').appendTo(plusApp.meta);
      }

      // Valtion verotuksen alaiset tulot.
      let valtioveron_alaiset_ansiotulot = ansiotulot;
      $('<div><span class="label">Valtion verotuksen alaiset tulot</span> <span class="value">' + plusApp.formatNr(plusApp.roundNr(valtioveron_alaiset_ansiotulot), 0)  + ' €</span></div>').appendTo(plusApp.meta);

      // Ansiotulovähennys.
      let ansiotulovahennys = (7230 - 2500) * 0.51 + (vuositulot - 7230) * 0.28;
      ansiotulovahennys = (ansiotulovahennys > 3570) ? 3570 : ansiotulovahennys;
      ansiotulovahennys = ansiotulovahennys - (((vuositulot - 750) - 14000) * 0.045);
      ansiotulovahennys = (ansiotulovahennys < 0) ? 0 : ansiotulovahennys;
      $('<div class="deduction"><span class="label">Ansiotulovähennys</span> <span class="value">' + plusApp.formatNr(plusApp.roundNr(ansiotulovahennys), 0)  + ' €</span></div>').appendTo(plusApp.meta);

      // Perusvähennys.
      let perusvahennys = 3060 - (((ansiotulot - ansiotulovahennys) - 3060) * 0.18);
      perusvahennys = (perusvahennys < 0) ? 0 : perusvahennys;
      $('<div class="deduction"><span class="label">Perusvähennys</span> <span class="value">' + plusApp.formatNr(plusApp.roundNr(perusvahennys), 0)  + ' €</span></div>').appendTo(plusApp.meta);

      // Valtion verot.
      let valtiovero = 0;
      if (valtioveron_alaiset_ansiotulot > 73100) {
        valtiovero = (valtioveron_alaiset_ansiotulot - 73100) * 0.3150 + 10174;
      }
      else if (valtioveron_alaiset_ansiotulot > 41200) {
        valtiovero = (valtioveron_alaiset_ansiotulot - 41200) * 0.2150 + 3315.50;
      }
      else if (valtioveron_alaiset_ansiotulot > 25300) {
        valtiovero = (valtioveron_alaiset_ansiotulot - 25300) * 0.1750 + 533;
      }
      else if (valtioveron_alaiset_ansiotulot > 16900) {
        valtiovero = (valtioveron_alaiset_ansiotulot - 16900) * 0.0625 + 8;
      }

      // Työtulovähennys.
      let enimmaistyotulovahennys;
      if (vuositulot > 33000) {
        let valtioveron_alaiset_ansiotulot_max = (valtioveron_alaiset_ansiotulot - 2500) * 0.12;
        valtioveron_alaiset_ansiotulot_max = (valtioveron_alaiset_ansiotulot_max > 1420) ? 1420 : valtioveron_alaiset_ansiotulot_max;
        enimmaistyotulovahennys = valtioveron_alaiset_ansiotulot_max - ((vuositulot - 750 - 33000) * 0.0151);
      }
      else {
        enimmaistyotulovahennys = 1420;
      }
      $('<div><span class="label">Enimmäisvähennys valtionverotuksessa</span> <span class="value">' + plusApp.formatNr(plusApp.roundNr(enimmaistyotulovahennys), 0)  + ' €</span></div>').appendTo(plusApp.meta);
      let tyotulovahennys = Math.max(enimmaistyotulovahennys - valtiovero, 0);

      // Valtion verot.
      valtiovero = Math.max(valtiovero - enimmaistyotulovahennys - tyotulovahennys, 0);

      ansiotulot = ansiotulot - ansiotulovahennys - perusvahennys;
      $('<div class="effective_income"><span class="label">Kunnallisverotuksessa verotettava tulo</span> <span class="value">' + plusApp.formatNr(plusApp.roundNr(ansiotulot), 0)  + ' € </span></div>').appendTo(plusApp.meta);
      $('<div class="tyotulovahennys"><span class="label">Kunnallisverosta tehtävä työtulovähennys</span> <span class="value">' + plusApp.formatNr(plusApp.roundNr(tyotulovahennys), 0)  + ' €</span></div>').appendTo(plusApp.meta);
      let kuntavero = ansiotulot * (tax_percent / 100) - tyotulovahennys;
      $('<div><span class="label">Kunnallisvero</span> <span class="value">' + plusApp.formatNr(plusApp.roundNr(kuntavero), 0)  + ' €</span></div>').appendTo(plusApp.meta);
      $('<div><span class="label">Valtion verot</span> <span class="value">' + plusApp.formatNr(plusApp.roundNr(valtiovero), 0)  + ' €</span></div>').appendTo(plusApp.meta);

      $('<div><span class="label">Ylevero</span> <span class="value">' + plusApp.formatNr(plusApp.roundNr(ylevero), 0) + ' €</span></div>').appendTo(plusApp.meta);
      return tyoelakevakuutusmaksu + tyottomyysvakuutusmaksu + sairausvakuutuksen_paivarahamaksu + kuntavero + valtiovero + ylevero;
    },
    printResults: () => {
      let result_container = $('.result_container', plus).show().empty();
      let tax = plusApp.calculateTax(plusApp.data.municipalities[plusApp.municipality_id].tax_percent);
      if (tax < 0) {
        $('<h3>Et maksa veroja</h3>').appendTo(result_container);
        $('<p>Tulosi ovat niin alhaiset, että et maksa lainkaan veroja.</p>').appendTo(result_container);
      }
      else {
        $('<h3>Maksat tuloveroja ja pakollisia maksuja ' + plusApp.formatNr(plusApp.roundNr(tax, 0)) + ' € vuonna 2017</h3>').appendTo(result_container);
        let tax_lastyear = plusApp.calculateTax(plusApp.data.municipalities[plusApp.municipality_id].tax_percent - plusApp.data.municipalities[plusApp.municipality_id].tax_percent_change);
        let meta = plusApp.meta;
        let vuositulot = plusApp.salary * 12;
        if (tax !== tax_lastyear) {
          if (tax > tax_lastyear) {
            $('<p>Todellinen eli efektiivinen veroprosenttisi vähennysten jälkeen on <span class="value">' + plusApp.formatNr(plusApp.roundNr((tax / vuositulot) * 100, 2)) + '</span>. Veroprosentti kunnassa ' + plusApp.data.municipalities[plusApp.municipality_id].name_fi + ' on <span class="value">' + plusApp.formatNr(plusApp.data.municipalities[plusApp.municipality_id].tax_percent) + '</span>. Vuodelle 2017 ' + plusApp.capitalizeFirstLetter(plusApp.municipality) + ' nosti kunnallisveroaan. Vuoden 2016 veroprosentilla maksaisit ' + plusApp.formatNr(plusApp.roundNr(tax_lastyear, 0)) + ' €.</p>').appendTo(result_container);
          }
          else {
            $('<p>Todellinen eli efektiivinen veroprosenttisi vähennysten jälkeen on <span class="value">' + plusApp.formatNr(plusApp.roundNr((tax / vuositulot) * 100, 2)) + '</span>. Veroprosentti kunnassa ' + plusApp.data.municipalities[plusApp.municipality_id].name_fi + ' on <span class="value">' + plusApp.formatNr(plusApp.data.municipalities[plusApp.municipality_id].tax_percent) + '</span>. Vuodelle 2017 ' + plusApp.capitalizeFirstLetter(plusApp.municipality) + ' laski kunnallisveroaan. Vuoden 2016 veroprosentilla maksaisit ' + plusApp.formatNr(plusApp.roundNr(tax_lastyear, 0)) + ' €.</p>').appendTo(result_container);
          }
        }
        else {
          $('<p>Todellinen eli efektiivinen veroprosenttisi vähennysten jälkeen on <span class="value">' + plusApp.formatNr(plusApp.roundNr((tax / vuositulot) * 100, 2)) + '</span>. Veroprosentti kunnassa ' + plusApp.data.municipalities[plusApp.municipality_id].name_fi + ' on <span class="value">' + plusApp.formatNr(plusApp.data.municipalities[plusApp.municipality_id].tax_percent) + '</span>.</p>').appendTo(result_container);
        }
        if (plusApp.municipality_id === '170') {
          $('<p>Maksat Suomen alhaisinta kunnallisveroa. Eniten maksaisit Savonlinnassa ja Jämijärvellä, ' + plusApp.formatNr(plusApp.roundNr(plusApp.calculateTax(22.5), 0)) + ' €.</p>').appendTo(result_container);
        }
        else if (plusApp.municipality_id === '740' || plusApp.municipality_id  === '181') {
          $('<p>Maksat Suomen korkeinta kunnallisveroa. Vähiten maksaisit Jomalassa, ' + plusApp.formatNr(plusApp.roundNr(plusApp.calculateTax(16.5), 0)) + ' €.</p>').appendTo(result_container);
        }
        else {
          $('<p>Vähiten maksaisit Ahvenanmaalla Jomalassa, ' + plusApp.formatNr(plusApp.roundNr(plusApp.calculateTax(16.5), 0)) + ' €. Eniten Jämijärvellä ja Savonlinnassa, ' + plusApp.formatNr(plusApp.roundNr(plusApp.calculateTax(22.5), 0)) + ' €.</p>').appendTo(result_container);
        }
        // let url = window.location.href;
        // $('<p>Jaa kunnan veroprosentti <a href="https://www.facebook.com/dialog/feed?app_id=147925155254978&display=popup&name=' + encodeURIComponent(plusApp.capitalizeFirstLetter(plusApp.municipality) + ' kunnallisveroprosentti on ' + plusApp.formatNr(plusApp.data.municipalities[plusApp.municipality_id].tax_percent) + '. Katso kuntasi tilanne ja laske kunnallisverosi') + '&caption=' + encodeURIComponent('Tarkista oman kuntasi tilanne') + '&link=' + encodeURIComponent(url) + '&redirect_uri=' + url + '" class="" target="_blank">Facebookissa</a> ja <a href="https://twitter.com/share?url=' + encodeURIComponent(url) + '&hashtags=' + encodeURIComponent('kunnallisvero') + '&text=' + encodeURIComponent(plusApp.capitalizeFirstLetter(plusApp.municipality) + ' kunnallisveroprosentti on ' + plusApp.formatNr(plusApp.data.municipalities[plusApp.municipality_id].tax_percent) + '. Katso kuntasi tilanne ja laske kunnallisverosi.') + '" class="" target="_blank">Twitterissä</a>.</p>').appendTo(result_container);
        $('<div class="more_container"><button class="more active">Näytä vähennykset</button></div>').appendTo(result_container);
        meta.appendTo(result_container);
      }
      let neighbors_container = $('<div class="neighbors_container"></div>').appendTo(result_container);
      $('<h3>Naapurikunnat</h3>').appendTo(neighbors_container);
      let table_container = $('<table></table>').appendTo(neighbors_container);
      $('<thead><tr><th>Kunta</th><th class="number">Vero-%</th><th class="number">€/12 kk</th><th class="number">Erotus</th></tr></thead>').appendTo(table_container);
      let tbody_container = $('<tbody></tbody>').appendTo(table_container);
      $.each(plusApp.data.neighbors[plusApp.municipality_id], (i, el) => {
        let tr_container = $('<tr></tr>').appendTo(tbody_container);
        if (plusApp.data.municipalities[el]) {
          $('<td>' + plusApp.data.municipalities[el].name_fi + '</td>').appendTo(tr_container);
          $('<td class="number">' + plusApp.formatNr(plusApp.data.municipalities[el].tax_percent) + '</td>').appendTo(tr_container);
          $('<td class="number">' + plusApp.formatNr(plusApp.roundNr(plusApp.calculateTax(plusApp.data.municipalities[el].tax_percent), 0)) + '</td>').appendTo(tr_container);
          let difference = plusApp.calculateTax(plusApp.data.municipalities[el].tax_percent) - tax;
          if (difference < 0) {
            $('<td class="number">' + plusApp.formatNr(plusApp.roundNr((difference), 0)) + ' €</td>').appendTo(tr_container);
          }
          else if (difference > 0) {
            $('<td class="number">+' + plusApp.formatNr(plusApp.roundNr((difference), 0)) + ' €</td>').appendTo(tr_container);
          }
          else {
            $('<td class="number">–</td>').appendTo(tr_container);
          }
        }
      });
    },
    initEvents: () => {
      $(window).on('resize', plusApp.getScale);
      plus.on('click', '.input_container .button', () => {
        plusApp.municipality = $('.municipality_input', plus).val();
        plusApp.salary = $('.salary_input', plus).val();
        $.each(plusApp.data.municipalities, (municipality_id, municipality) => {
          if (municipality.name_fi.toLowerCase() === plusApp.municipality.toLowerCase() && plusApp.salary >= 0) {
            plusApp.municipality_id = municipality_id;
            plusApp.printResults();
            return false;
          }
        });
      });
      plus.on('click', '.more_container .more', () => {
        if ($(this).text() === 'Näytä tarkemmat tiedot') {
          $(this).text('Piilota vähennykset');
        }
        else {
          $(this).text('Näytä vähennykset');
        }
        $('.meta_container', plus).slideToggle();
      });
    },
    unmount: () => {
      $(window).off('resize', plusApp.getScale);
      if (plus !== undefined) {
        plus.unbind();
      }
      delete window.plusApp[plusApp.projectName];
    },
    mount: () => {
      plusApp.init();
      plusApp.isInitialized = true;
    },
    init: () => {
      plus = $('.plus-app.plus-app-' + plusApp.projectName);
      plusApp.setPath();
      plusApp.getScale();
      plusApp.initMediaUrls();
      plusApp.initEvents();

      plusApp.getData();
    },
    meta: {
      version:'1.0.0'
    }
  };
  plusApp.projectName = '2017-10-verolaskuri';
  if (window.plusApp === undefined) {
    window.plusApp = {};
  }
  if (window.plusApp[plusApp.projectName] === undefined) {
    window.plusApp[plusApp.projectName] = plusApp;
    window.plusApp[plusApp.projectName].mount();
  }
})(jQuery);
