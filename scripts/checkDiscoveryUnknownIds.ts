import taskData from '../src/data/tasks.json';

const discoveryUnknownIds = [
  '6834145ebc1f443d7603c8a7',
  '6834158f2f0e2a7eb90b62c8',
  '68341846186efa3c5b07f989',
  '68341a0b2f0e2a7eb90b62d4',
  '697878057aa1273126030fb0',
  '69788d4e963f08d9140bce19',
  '69fa5e0f04087f435106b9c7',
  '6a1c766939a00fb24a0b8d25',
  '6a1c79503bec45f2d70000da',
  '6a39936fec86c6005a0656c1',
  '6a446573cd2959c3a609f2a9',
  '6a5424ae135497b9df0c68be',
  '6a5c1578f2689567c30eb0f3',
  '6a5ccda873f06065630d61b0',
  '6a5cd2178fd7c2b201032f3f',
  '6a7637fed31fb1191903fc07',
  '6a91840a740be0cff50e0310',
];

const tasks = new Map((taskData.tasks as Array<{ id: string; title: string }>).map((task) => [task.id, task]));

const rows = discoveryUnknownIds.map((id) => {
  const task = tasks.get(id);
  return {
    id,
    presentInPveJson: Boolean(task),
    resolvedTaskName: task?.title.trim() ?? '',
    classification: task ? 'resolved' : 'absent-upstream',
  };
});

console.table(rows);
const resolved = rows.filter((row) => row.classification === 'resolved').length;
console.log(`${resolved}/${rows.length} discovery unknown IDs are now resolved by the PvE JSON catalog.`);
