import renderGUI from '../src/playground/render-gui.jsx'

const div = document.createElement('div')
div.style.height = '100dvh'
document.body.append(div)
renderGUI(div)
