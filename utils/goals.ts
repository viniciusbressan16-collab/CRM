export type GoalPeriod = 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual' | 'Semanal' | 'Diário';

export const getCurrentPeriodKey = (period: string): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');

    switch (period) {
        case 'Diário':
            const day = now.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
        case 'Semanal':
            // Simple week calculation
            const firstDayOfYear = new Date(year, 0, 1);
            const days = Math.floor((now.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000));
            const weekNumber = Math.ceil((days + firstDayOfYear.getDay() + 1) / 7);
            return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
        case 'Mensal':
            return `${year}-${month}`;
        case 'Trimestral':
            const quarter = Math.floor(now.getMonth() / 3) + 1;
            return `${year}-Q${quarter}`;
        case 'Semestral':
            const semester = now.getMonth() < 6 ? 1 : 2;
            return `${year}-S${semester}`;
        case 'Anual':
            return `${year}`;
        default:
            return `${year}-${month}`;
    }
};

export const getPeriodLabel = (periodKey: string): string => {
    if (!periodKey) return 'Período Desconhecido';

    const parts = periodKey.split('-');
    if (parts.length === 1) return `Ano ${parts[0]}`;

    const [year, suffix] = parts;

    if (suffix.startsWith('Q')) return `${suffix.replace('Q', 'º Trimestre')} de ${year}`;
    if (suffix.startsWith('S')) return `${suffix.replace('S', 'º Semestre')} de ${year}`;
    if (suffix.startsWith('W')) return `Semana ${suffix.replace('W', '')} de ${year}`;
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${year}`; // Daily

    // Monthly
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthIdx = parseInt(suffix) - 1;
    return `${months[monthIdx]} / ${year}`;
};
