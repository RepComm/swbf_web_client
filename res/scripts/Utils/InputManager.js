
class InputManager {
    constructor () {
        this.keys = {};
        this.mouse = {
            leftIsDown:false,
            rightIsDown:false,
            x:0,
            y:0,
            xlast:0,
            ylast:0
        };
    }
    
    onKeyDown (evt) {
        this.keys[evt.key] = true;
    }
    
    onKeyUp (evt) {
        this.keys[evt.key] = false;
    }
    
    init (element) {
        element.addEventListener("keydown", (evt) => this.onKeyDown(evt) );
        element.addEventListener("keyup", (evt) => this.onKeyUp(evt) );
    }
}

