const fs = require('fs');
const file = 'src/components/common/Sidebar/Sidebar.tsx';
let c = fs.readFileSync(file, 'utf8');

// Keep only content up to first navItems closing + first Sidebar component + export
const navStart = c.indexOf('const navItems: NavItem[] = [');
const sidebarStart = c.indexOf('const Sidebar: React.FC');
const exportLine = 'export default Sidebar;';

// Find the FIRST export default
const exportStart = c.indexOf(exportLine);

const clean = c.slice(0, navStart) + 
              c.slice(navStart, sidebarStart) + 
              c.slice(sidebarStart, exportStart + exportLine.length);

fs.writeFileSync(file, clean);
console.log('Lines:', clean.split('\n').length);
