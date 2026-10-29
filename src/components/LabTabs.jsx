// "My lab" groups the PI's lab-running pages under one header item.
const TABS = [
  ['people', 'People'],
  ['meetings', 'Lab meetings'],
  ['deadlines', 'Deadlines'],
  ['handoff', 'People leaving'],
];

export default function LabTabs({ current }) {
  return (
    <nav className="lab-tabs" aria-label="My lab">
      <div className="lab-tabs-inner">
        {TABS.map(([id, label]) => (
          <a key={id} href={`#/${id}`} aria-current={current === id ? 'page' : undefined}>
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
