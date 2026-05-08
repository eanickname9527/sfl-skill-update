/**
 * SFL 技能效益計算器 - 主邏輯
 */

document.addEventListener('DOMContentLoaded', () => {
    const enemyAttr1Select = document.getElementById('enemyAttr1');
    const enemyAttr2Select = document.getElementById('enemyAttr2');
    const totalActionsInput = document.getElementById('totalActions');
    const tinisToggle = document.getElementById('tinisToggle');
    const elementalControl = document.getElementById('elementalControl');
    const skillListContainer = document.getElementById('skillList');

    // 1. 初始化屬性選單
    function initAttributeSelects() {
        if (typeof ATTRIBUTE_DATA === 'undefined') {
            console.error('找不到 ATTRIBUTE_DATA');
            return;
        }

        const allAttrs = [...ATTRIBUTE_DATA.basic, ...ATTRIBUTE_DATA.cosmic];
        
        // 加入 "無" 選項作為預設或空值
        const options = allAttrs.map(attr => `<option value="${attr}">${attr}</option>`).join('');
        const optionsWithNone = `<option value="無">無</option>` + options;

        enemyAttr1Select.innerHTML = optionsWithNone;
        enemyAttr2Select.innerHTML = optionsWithNone;

        // 預設值
        enemyAttr1Select.value = '火';
        enemyAttr2Select.value = '無';
    }


    // 2. 計算技能在指定行動次數內的可用次數
    function countUses(ub, cd, totalActions) {
        if (totalActions < ub + 1) return 0;
        return 1 + Math.floor((totalActions - ub - 1) / (cd + 1));
    }

    // 3. 取得每級成長倍率
    function getGrowthRate(multi) {
        if (typeof multi !== 'function') return 0;
        // 假設公式為 A + lv * B，則成長率為 B = multi(1) - multi(0)
        // 為了保險，計算 multi(2) - multi(1) 也可以
        try {
            return multi(1) - multi(0);
        } catch (e) {
            return 0;
        }
    }

    // 4. 計算總效益
    function calculateEfficiency() {
        if (typeof ATTACK_SKILLS_DATA === 'undefined' || typeof getAttributeMultiplier === 'undefined') {
            skillListContainer.innerHTML = '<div class="loading">資料加載失敗...</div>';
            return;
        }

        const eAttr1 = enemyAttr1Select.value;
        const eAttr2 = enemyAttr2Select.value;
        const totalActions = parseInt(totalActionsInput.value) || 0;
        const isTinisActive = tinisToggle.checked;
        const elementBonus = parseFloat(elementalControl.value) || 0;

        const results = [];

        // 獲取所有屬性列表用於過濾
        const validAttrs = [...ATTRIBUTE_DATA.basic, ...ATTRIBUTE_DATA.cosmic, '無'];

        for (const [name, data] of Object.entries(ATTACK_SKILLS_DATA)) {
            // 過濾技能：僅考慮 ATTRIBUTE_DATA 有的屬性和無屬性
            if (!validAttrs.includes(data.attr)) continue;

            const growthRate = getGrowthRate(data.multi);
            if (growthRate <= 0 && name !== '普攻') continue; // 忽略無成長的技能（除了普攻作參考，雖然普攻成長也是0）

            let multipliers = [];
            if (eAttr1 !== '無') multipliers.push(getAttributeMultiplier(data.attr, eAttr1));
            if (eAttr2 !== '無') multipliers.push(getAttributeMultiplier(data.attr, eAttr2));

            // ① 計算原始屬性倍率 (多屬性取平均)
            let rawMultiplier;
            if (multipliers.length === 0) {
                rawMultiplier = 1.0;
            } else {
                rawMultiplier = multipliers.reduce((a, b) => a + b, 0) / multipliers.length;
            }

            // ② & ③ 若原始倍率 > 1.0，加上元素掌控加成
            let totalMultiplier = rawMultiplier;
            if (rawMultiplier > 1.0) {
                totalMultiplier += elementBonus;
            }

            // 提妮絲效果
            let skillUB = data.ub;
            let skillCD = data.cd;
            if (isTinisActive) {
                skillUB = Math.max(0, skillUB - 3);
                skillCD = Math.max(0, skillCD - 1);
            }

            const numUses = countUses(skillUB, skillCD, totalActions);
            const efficiency = growthRate * numUses * totalMultiplier;

            results.push({
                name,
                attr: data.attr,
                ub: skillUB,
                cd: skillCD,
                numUses,
                multiplier: totalMultiplier,
                efficiency: efficiency.toFixed(3),
                growth: growthRate.toFixed(2)
            });
        }

        // 排序：效益從高到低
        results.sort((a, b) => b.efficiency - a.efficiency);

        renderResults(results);
    }

    // 5. 渲染結果
    function renderResults(results) {
        if (results.length === 0) {
            skillListContainer.innerHTML = '<div class="loading">無相符技能</div>';
            return;
        }

        skillListContainer.innerHTML = results.map((skill, index) => `
            <div class="skill-card" style="animation-delay: ${index * 0.05}s">
                <div class="skill-rank">#${index + 1}</div>
                <div class="skill-info">
                    <div class="skill-name">${skill.name}</div>
                    <div class="skill-attr">${skill.attr}</div>
                </div>
                <div class="skill-stats">
                    <span>準備: ${skill.ub}</span>
                    <span>冷卻: ${skill.cd}</span>
                    <span>次數: ${skill.numUses}</span>
                </div>
                <div class="skill-stats">
                    <span>屬性倍率: x${skill.multiplier.toFixed(2)}</span>
                    <span>每級成長: ${skill.growth}</span>
                </div>
                <div class="skill-efficiency">
                    <span class="efficiency-label">升級效益 (總傷害成長)</span>
                    <span class="efficiency-value">${skill.efficiency}</span>
                </div>
            </div>
        `).join('');
    }

    // 事件監聽
    enemyAttr1Select.addEventListener('change', calculateEfficiency);
    enemyAttr2Select.addEventListener('change', calculateEfficiency);
    tinisToggle.addEventListener('change', calculateEfficiency);
    elementalControl.addEventListener('change', calculateEfficiency);
    totalActionsInput.addEventListener('input', () => {
        calculateEfficiency();
        
        // 彩蛋邏輯
        const easterEgg = document.getElementById('easterEgg');
        const actions = parseInt(totalActionsInput.value) || 0;
        if (actions > 50) {
            easterEgg.style.display = 'block';
        } else {
            easterEgg.style.display = 'none';
        }
    });

    // 初始化
    initAttributeSelects();
    calculateEfficiency();
});
