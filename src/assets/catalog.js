// These filenames were verified from the user's HTTPS directory listing on 19 October 2026.
// Not included in this repository: GLBs are served at runtime through server/index.js.
export const CARS = [
  { id:'f40', modelHeading:Math.PI, name:'F40 Competizione', maker:'Ferrari', file:'1989_ferrari_f40_competizione.glb', topSpeed:329, acceleration:7.8, handling:7.7, brake:7.1, accent:'#ff334f', drive:{gears:5,idle:1050,redline:7700,peak:5400,response:.75,shift:.32} },
  { id:'ccxr', modelHeading:Math.PI, name:'CCXR', maker:'Koenigsegg', file:'2007_koenigsegg_ccxr.glb', topSpeed:395, acceleration:9.5, handling:8.0, brake:8.2, accent:'#00cfff', drive:{gears:6,idle:850,redline:7600,peak:5900,response:1.06,shift:.22} },
  { id:'bentley', modelHeading:Math.PI, name:'Continental GT Speed', maker:'Bentley', file:'2022_bentley_continental_gt_speed.glb', topSpeed:335, acceleration:7.6, handling:6.8, brake:8.1, accent:'#ffac43', drive:{gears:8,idle:750,redline:6500,peak:3600,response:1.1,shift:.18} },
  { id:'f296', modelHeading:Math.PI, name:'296 Speciale A', maker:'Ferrari', file:'2026_ferrari_296_speciale_a.glb', topSpeed:330, acceleration:9.1, handling:9.4, brake:9.2, accent:'#e83939', drive:{gears:8,idle:1050,redline:8500,peak:6600,response:1.16,shift:.16} },
  { id:'nascar', modelHeading:Math.PI, name:'SS NASCAR', maker:'Chevrolet', file:'chevrolet_ss_nascar_racing_car.glb', topSpeed:325, acceleration:8.0, handling:7.0, brake:7.0, accent:'#ffdc4f', drive:{gears:4,idle:1100,redline:8500,peak:6800,response:.85,shift:.38} },
  { id:'amg', modelHeading:0, name:'AMG GT3', maker:'Mercedes-Benz', file:'mercedes-amg_gt3_red_bull_racing.glb', topSpeed:310, acceleration:8.0, handling:9.2, brake:9.5, accent:'#7d78ff', drive:{gears:6,idle:850,redline:7500,peak:5800,response:.96,shift:.14} }
];
export const MAPS = [
  { id:'laguna', name:'Laguna Seca', file:'laguna_seca(MAP 1).glb', kind:'Circuit', detail:'Track-focused racing and sharp elevation changes', span:2160, climate:'Golden Hour', image:'/references/maps.png' },
  { id:'woods', name:'Country Woods', file:'nfs_iii_hot_pursuit_-_country_woods.glb', kind:'Forest', detail:'Winding country roads and dense scenery', span:1900, climate:'Overcast', image:'/references/maps.png' },
  { id:'rocky', name:'Rocky Pass', file:'nfs_iii_hot_pursuit_-_rocky_pass.glb', kind:'Mountains', detail:'Fast mountain roads, rocks and sweeping corners', span:1950, climate:'Morning', image:'/references/maps.png' }
];
export const GARAGE = { file:'garage__warehouse.glb', span:40 };
export const NOS = { file:'NOS.glb' };
export const DRIVER = { file:'race_driver.glb' };
export const ASSET_FILES = [...CARS, ...MAPS, GARAGE, NOS, DRIVER].map(a=>a.file);
export const findCar = (id) => CARS.find(a=>a.id===id) || CARS[0];
export const findMap = (id) => MAPS.find(a=>a.id===id) || MAPS[0];
