class PieOffice {
    constructor() {
        this.editor = document.getElementById('editor');
        this.docTitle = document.getElementById('docTitle');
        this.statusDot = document.querySelector('.status-dot');
        this.statusText = document.getElementById('statusText');
        this.wordCount = document.getElementById('wordCount');
        this.charCount = document.getElementById('charCount');
        this.saveModal = document.getElementById('saveModal');
        this.fileInput = document.getElementById('fileInput');
        this.imageInput = document.getElementById('imageInput');
        
        this.isDirty = false;
        this.autoSaveTimer = null;
        
        this.init();
    }

    init() {
        this.bindToolbar();
        this.bindKeyboard();
        this.bindEvents();
        this.loadFromStorage();
        this.updateCounts();
        this.updateToolbarState();
    }

    bindToolbar() {
        document.querySelectorAll('.toolbar-btn[data-cmd]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
            });
            btn.addEventListener('click', (e) => {
                const cmd = btn.dataset.cmd;
                this.execCommand(cmd);
            });
        });

        document.getElementById('fontFamily').addEventListener('change', (e) => {
            this.execCommand('fontName', e.target.value);
        });

        document.getElementById('fontSize').addEventListener('change', (e) => {
            this.execCommand('fontSize', e.target.value);
        });

        document.getElementById('formatBlock').addEventListener('change', (e) => {
            this.execCommand('formatBlock', `<${e.target.value}>`);
        });

        document.getElementById('textColor').addEventListener('input', (e) => {
            this.execCommand('foreColor', e.target.value);
        });

        document.getElementById('bgColor').addEventListener('input', (e) => {
            this.execCommand('hiliteColor', e.target.value);
        });

        document.querySelector('[data-cmd="createLink"]').addEventListener('click', () => {
            const url = prompt('Введите URL:', 'https://');
            if (url) {
                this.execCommand('createLink', url);
            }
        });

        document.getElementById('btnInsertImage').addEventListener('click', () => {
            this.imageInput.click();
        });

        document.getElementById('btnInsertTable').addEventListener('click', () => {
            this.insertTable();
        });

        document.getElementById('btnSave').addEventListener('click', () => {
            this.saveModal.classList.add('active');
        });

        document.getElementById('closeSaveModal').addEventListener('click', () => {
            this.saveModal.classList.remove('active');
        });

        this.saveModal.addEventListener('click', (e) => {
            if (e.target === this.saveModal) {
                this.saveModal.classList.remove('active');
            }
        });

        document.getElementById('saveHTML').addEventListener('click', () => this.saveAsHTML());
        document.getElementById('saveTXT').addEventListener('click', () => this.saveAsTXT());
        document.getElementById('savePrint').addEventListener('click', () => this.printDocument());

        document.getElementById('btnOpen').addEventListener('click', () => {
            this.fileInput.click();
        });
    }

    execCommand(cmd, value = null) {
        document.execCommand(cmd, false, value);
        this.editor.focus();
        this.markDirty();
        this.updateToolbarState();
    }

    updateToolbarState() {
        document.querySelectorAll('.toolbar-btn[data-cmd]').forEach(btn => {
            const cmd = btn.dataset.cmd;
            try {
                if (document.queryCommandState(cmd)) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            } catch(e) {}
        });
    }

    bindKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key.toLowerCase()) {
                    case 's':
                        e.preventDefault();
                        this.saveToStorage();
                        this.saveModal.classList.add('active');
                        break;
                    case 'b':
                        e.preventDefault();
                        this.execCommand('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.execCommand('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        this.execCommand('underline');
                        break;
                }
            }
        });
    }

    bindEvents() {
        this.editor.addEventListener('input', () => {
            this.markDirty();
            this.updateCounts();
            this.scheduleAutoSave();
        });

        this.editor.addEventListener('mouseup', () => this.updateToolbarState());
        this.editor.addEventListener('keyup', () => this.updateToolbarState());

        this.fileInput.addEventListener('change', (e) => this.handleFileOpen(e));
        this.imageInput.addEventListener('change', (e) => this.handleImageInsert(e));

        this.docTitle.addEventListener('input', () => this.markDirty());

        window.addEventListener('beforeunload', (e) => {
            if (this.isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    handleFileOpen(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            
            if (file.name.endsWith('.txt')) {
                this.editor.innerText = content;
            } else {
                const parser = new DOMParser();
                const doc = parser.parseFromString(content, 'text/html');
                this.editor.innerHTML = doc.body.innerHTML || content;
            }

            this.docTitle.value = file.name.replace(/\.[^.]+$/, '');
            this.markDirty();
            this.saveToStorage();
        };
        reader.readAsText(file);
        this.fileInput.value = '';
    }

    handleImageInsert(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = `<img src="${event.target.result}" alt="image" style="max-width:100%;">`;
            this.execCommand('insertHTML', img);
        };
        reader.readAsDataURL(file);
        this.imageInput.value = '';
    }

    insertTable() {
        const rows = prompt('Количество строк:', '3');
        const cols = prompt('Количество столбцов:', '3');
        
        if (!rows || !cols) return;
        
        let table = '<table>';
        for (let i = 0; i < parseInt(rows); i++) {
            table += '<tr>';
            for (let j = 0; j < parseInt(cols); j++) {
                table += i === 0 ? '<th>&nbsp;</th>' : '<td>&nbsp;</td>';
            }
            table += '</tr>';
        }
        table += '</table><p><br></p>';
        
        this.execCommand('insertHTML', table);
    }

    saveAsHTML() {
        const title = this.docTitle.value || 'document';
        const html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body { font-family: 'Inter', Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.7; }
        h1 { font-size: 2em; margin-bottom: 0.5em; }
        h2 { font-size: 1.5em; margin-bottom: 0.5em; }
        blockquote { border-left: 4px solid #4f46e5; padding: 12px 20px; margin: 1em 0; background: #eef2ff; }
        table { width: 100%; border-collapse: collapse; margin: 1em 0; }
        table td, table th { border: 1px solid #e2e8f0; padding: 8px 12px; }
        table th { background: #eef2ff; }
        img { max-width: 100%; }
    </style>
</head>
<body>
${this.editor.innerHTML}
</body>
</html>`;
        this.downloadFile(`${title}.html`, html, 'text/html');
        this.saveModal.classList.remove('active');
        this.markClean();
    }

    saveAsTXT() {
        const title = this.docTitle.value || 'document';
        const text = this.editor.innerText;
        this.downloadFile(`${title}.txt`, text, 'text/plain');
        this.saveModal.classList.remove('active');
        this.markClean();
    }

    printDocument() {
        this.saveModal.classList.remove('active');
        window.print();
    }

    downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    saveToStorage() {
        const data = {
            title: this.docTitle.value,
            content: this.editor.innerHTML,
            savedAt: new Date().toISOString()
        };
        localStorage.setItem('pieOffice_document', JSON.stringify(data));
    }

    loadFromStorage() {
        const saved = localStorage.getItem('pieOffice_document');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.docTitle.value = data.title || 'Без названия';
                this.editor.innerHTML = data.content || this.editor.innerHTML;
            } catch(e) {
                console.warn('Failed to load saved document:', e);
            }
        }
    }

    scheduleAutoSave() {
        clearTimeout(this.autoSaveTimer);
        this.autoSaveTimer = setTimeout(() => {
            this.saveToStorage();
        }, 3000);
    }

    markDirty() {
        this.isDirty = true;
        this.statusDot.className = 'status-dot unsaved';
        this.statusText.textContent = 'Не сохранено';
    }

    markClean() {
        this.isDirty = false;
        this.statusDot.className = 'status-dot saved';
        this.statusText.textContent = 'Сохранено';
        this.saveToStorage();
    }

    updateCounts() {
        const text = this.editor.innerText.trim();
        const words = text ? text.split(/\s+/).length : 0;
        const chars = text.length;
        
        this.wordCount.textContent = `Слов: ${words}`;
        this.charCount.textContent = `Символов: ${chars}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new PieOffice();
});
