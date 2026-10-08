const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),ts=require('typescript'),React=require('react');
let menu=false,route;
const exportsObject={},widget=props=>React.createElement('Widget',props,props.children);
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/mood-log-card.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:exportsObject,require:id=>{
 if(id==='react')return {...React,useState:()=>[menu,value=>{menu=typeof value==='function'?value(menu):value;}]};
 if(id==='expo-router')return {useRouter:()=>({push:value=>{route=value;}})};
 if(id==='react-native')return {Pressable:widget,View:widget,StyleSheet:{create:value=>value}};
 if(id==='@/components/text')return {AppText:widget};
 if(id==='@/components/care-icon')return {CareIcon:widget};
 if(id==='@/components/mood-option-card')return {MoodFace:widget};
 if(id==='@/components/student-ui')return {StudentCard:widget};
 if(id==='@/components/mood-reflection-panel')return {MoodReflectionPanel:widget};
 if(id==='@/constants/colors')return {Colors:{}};
 return require(id);
}});
const entry={id:'own-entry',mood:'Very Low',note:'An original note',createdAt:{toDate:()=>new Date(2026,9,7,14,51)}};
const props={entry,reflectionDisabled:false,onReflectionChanged:()=>{}};
const nodes=tree=>Array.isArray(tree)?tree.flatMap(nodes):tree&&typeof tree==='object'?[tree,...nodes(tree.props?.children)]:[];
const render=()=>nodes(exportsObject.MoodLogCard(props));
const more=()=>render().find(node=>node.props?.accessibilityLabel?.startsWith('Check-in actions'));
assert.ok(!render().some(node=>node.props?.accessibilityLabel==='Delete check-in'));
more().props.onPress();assert.equal(more().props.accessibilityState.expanded,true);
for(const action of ['edit','delete']){
 render().find(node=>node.props?.accessibilityLabel===`${action==='edit'?'Edit':'Delete'} check-in`).props.onPress();
 assert.equal(route.pathname,'/student/mood/edit/[id]');assert.equal(route.params.id,'own-entry');assert.equal(route.params.action,action);assert.equal(menu,false);
 more().props.onPress();
}
more().props.onPress();assert.equal(menu,false);
console.log('PASS: overflow toggles and closes; both actions navigate to the existing Azhmen route with the correct entry and intent. No card-level mood CRUD.');
