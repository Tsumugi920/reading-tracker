// 阅读目标模块：设定年度目标并展示进度
import { api } from './api.js';
import { showToast } from './utils.js';

function renderGoal(goal) {
  document.getElementById('goal-input').value = goal.yearlyTarget;
  const percent = Math.min(100, goal.percent || 0);
  const hint = goal.yearlyTarget === 0
    ? '先设定一个目标，让阅读更有方向感。'
    : goal.remaining === 0
      ? '🎉 目标已达成，给自己一点掌声！'
      : `还差 ${goal.remaining} 本就完成今年的目标，加油！`;

  document.getElementById('goal-progress').innerHTML = `
    <div class="goal-progress">
      <div class="progress big"><div class="progress-fill" style="width:${percent}%"></div></div>
      <p class="goal-line">
        ${goal.year} 年已读完 <strong>${goal.finishedThisYear}</strong> 本
        / 目标 <strong>${goal.yearlyTarget}</strong> 本
        ${goal.yearlyTarget > 0 ? `（完成 ${goal.percent}%）` : ''}
      </p>
      <p class="muted">${hint}</p>
    </div>`;
}

export async function refreshGoals() {
  try {
    renderGoal(await api.get('/goals'));
  } catch (err) {
    showToast(err.message, 'error');
  }
}

export function initGoals() {
  document.getElementById('goal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const yearlyTarget = Number(document.getElementById('goal-input').value);
    try {
      const goal = await api.put('/goals', { yearlyTarget });
      showToast(`年度目标已设为 ${goal.yearlyTarget} 本 🎯`, 'success');
      renderGoal(goal);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
