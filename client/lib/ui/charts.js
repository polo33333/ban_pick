function createCharts(characters) {
    const charArray = Object.entries(characters).map(([name, stats]) => ({ name, ...stats }));
    const topBanned = charArray.sort((a, b) => b.totalBans - a.totalBans).slice(0, 10);
    const topPicked = charArray.sort((a, b) => b.totalPicks - a.totalPicks).slice(0, 10);

    // Properly check and destroy existing charts
    if (window.banChart && typeof window.banChart.destroy === 'function') {
        window.banChart.destroy();
    }
    if (window.pickChart && typeof window.pickChart.destroy === 'function') {
        window.pickChart.destroy();
    }

    // Ban Chart - Pie Chart with different colors
    window.banChart = new Chart(document.getElementById('banChart').getContext('2d'), {
        type: 'pie',
        data: {
            labels: topBanned.map(c => c.name),
            datasets: [{
                label: 'Lượt Cấm',
                data: topBanned.map(c => c.totalBans),
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',   // Red
                    'rgba(249, 115, 22, 0.8)',  // Orange
                    'rgba(245, 158, 11, 0.8)',  // Amber
                    'rgba(234, 179, 8, 0.8)',   // Yellow
                    'rgba(132, 204, 22, 0.8)',  // Lime
                    'rgba(34, 197, 94, 0.8)',   // Green
                    'rgba(20, 184, 166, 0.8)',  // Teal
                    'rgba(59, 130, 246, 0.8)',  // Blue
                    'rgba(139, 92, 246, 0.8)',  // Purple
                    'rgba(236, 72, 153, 0.8)'   // Pink
                ],
                borderColor: [
                    'rgba(220, 38, 38, 1)',
                    'rgba(234, 88, 12, 1)',
                    'rgba(217, 119, 6, 1)',
                    'rgba(202, 138, 4, 1)',
                    'rgba(101, 163, 13, 1)',
                    'rgba(22, 163, 74, 1)',
                    'rgba(13, 148, 136, 1)',
                    'rgba(37, 99, 235, 1)',
                    'rgba(124, 58, 237, 1)',
                    'rgba(219, 39, 119, 1)'
                ],
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'right',
                    labels: {
                        color: '#e2e8f0',
                        font: { size: 11 },
                        padding: 10,
                        boxWidth: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 31, 46, 0.95)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#e2e8f0',
                    borderColor: '#2d3748',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} lượt (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Pick Chart - Bar Chart with different colors for each bar
    window.pickChart = new Chart(document.getElementById('pickChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: topPicked.map(c => c.name),
            datasets: [{
                label: 'Pick Count',
                data: topPicked.map(c => c.totalPicks),
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',   // Red
                    'rgba(249, 115, 22, 0.8)',  // Orange
                    'rgba(245, 158, 11, 0.8)',  // Amber
                    'rgba(234, 179, 8, 0.8)',   // Yellow
                    'rgba(132, 204, 22, 0.8)',  // Lime
                    'rgba(34, 197, 94, 0.8)',   // Green
                    'rgba(20, 184, 166, 0.8)',  // Teal
                    'rgba(59, 130, 246, 0.8)',  // Blue
                    'rgba(139, 92, 246, 0.8)',  // Purple
                    'rgba(236, 72, 153, 0.8)'   // Pink
                ],
                borderColor: [
                    'rgba(220, 38, 38, 1)',
                    'rgba(234, 88, 12, 1)',
                    'rgba(217, 119, 6, 1)',
                    'rgba(202, 138, 4, 1)',
                    'rgba(101, 163, 13, 1)',
                    'rgba(22, 163, 74, 1)',
                    'rgba(13, 148, 136, 1)',
                    'rgba(37, 99, 235, 1)',
                    'rgba(124, 58, 237, 1)',
                    'rgba(219, 39, 119, 1)'
                ],
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(26, 31, 46, 0.95)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#e2e8f0',
                    borderColor: '#2d3748',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#94a3b8', font: { size: 11 } },
                    grid: { color: 'rgba(45, 55, 72, 0.5)', drawBorder: false }
                },
                x: {
                    ticks: { color: '#94a3b8', font: { size: 11 }, maxRotation: 45, minRotation: 45 },
                    grid: { display: false }
                }
            }
        }
    });
}
