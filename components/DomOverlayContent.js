function DomOverlayContent() {
    return (
        <div id="dom-overlay">
            <div id="tracking-prompt"><img src="/hand.png" alt="Tracking prompt" /></div>
            <div id="instructions">Tap to grow</div>
            <div id="ar-ui">
                <div id="headline" className="headline">
                    <h2>Grünstadt</h2>
                    <p id="debug"></p>
                </div>
                <div id="main-ui" data-ui="true" className="buttons">
                    <select name="plants" id="plants">
                        <option value="grass1">Gras 1</option>
                        <option value="grass2">Gras 2</option>
                        <option value="grass3">Gras 3</option>
                        <option value="tree2">Ahorn</option>
                    </select>
                    <button id="button-load-scene">Load</button>
                    <button id="button-save-scene">Save</button>
                    <button id="button-back">Zurück</button>
                </div>
            </div>
        </div>
    )
}

export default DomOverlayContent;