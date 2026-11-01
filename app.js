const API_BASE_URL = "https://6lx3pw9eyc.execute-api.us-east-1.amazonaws.com";

const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
});

function atualizarNomeArquivo() {
    const input = document.getElementById('fileInput');
    const display = document.getElementById('fileNameDisplay');
    const dropZone = document.getElementById('dropZone');
    
    if (input.files.length > 0) {
        display.innerHTML = `<i class="fas fa-check text-emerald-500 mr-1"></i> <span class="text-indigo-700 font-bold">${input.files[0].name}</span>`;
        dropZone.classList.add('border-indigo-400', 'bg-indigo-50');
    } else {
        display.innerText = "Nenhum selecionado";
        dropZone.classList.remove('border-indigo-400', 'bg-indigo-50');
    }
}

function obterIconeArquivo(nome) {
    const ext = nome.split('.').pop().toLowerCase();
    const icones = {
        'pdf': 'fa-file-pdf text-red-500',
        'jpg': 'fa-file-image text-emerald-500',
        'jpeg': 'fa-file-image text-emerald-500',
        'png': 'fa-file-image text-emerald-500',
        'doc': 'fa-file-word text-blue-600',
        'docx': 'fa-file-word text-blue-600',
        'xls': 'fa-file-excel text-green-600',
        'xlsx': 'fa-file-excel text-green-600',
        'zip': 'fa-file-archive text-amber-500',
        'txt': 'fa-file-alt text-slate-500',
        'mp4': 'fa-file-video text-purple-500',
        'mp3': 'fa-file-audio text-yellow-500'
    };
    return icones[ext] || 'fa-file text-indigo-400';
}

async function listarArquivos() {
    const container = document.getElementById('listaArquivos');
    
    container.innerHTML = `
        <div class="col-span-full flex flex-col items-center justify-center py-16 text-slate-400">
            <i class="fas fa-spinner fa-pulse text-4xl mb-4 text-indigo-400"></i>
            <p class="font-bold text-sm tracking-wide">BUSCANDO ARQUIVOS...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE_URL}/arquivos`);
        const arquivos = await response.json();
        container.innerHTML = ''; 
        
        if (arquivos.length === 0) {
            container.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                    <div class="bg-slate-50 p-6 rounded-full mb-4">
                        <i class="fas fa-box-open text-5xl text-slate-300"></i>
                    </div>
                    <h3 class="text-lg font-bold text-slate-600">Bucket Vazio</h3>
                    <p class="text-sm">Não há arquivos armazenados no S3.</p>
                </div>`;
            return;
        }

        arquivos.forEach(arq => {
            const nome = arq.nome; 
            const icone = obterIconeArquivo(nome);
            
            const div = document.createElement('div');
            div.className = 'group bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:shadow-lg hover:border-indigo-300 transition-all duration-300';
            div.innerHTML = `
                <div class="flex items-start gap-4 mb-5">
                    <div class="bg-slate-50 p-3.5 rounded-xl group-hover:bg-indigo-50 transition-colors">
                        <i class="fas ${icone} text-2xl"></i>
                    </div>
                    <div class="overflow-hidden w-full pt-1">
                        <span class="font-bold text-slate-700 block truncate w-full text-sm" title="${nome}">${nome}</span>
                        <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-1 block"><i class="fas fa-cloud text-xs mr-1"></i> Armazenado</span>
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 mt-auto">
                    <button onclick="detalhesArquivo('${nome}')" class="flex flex-col items-center text-[11px] font-bold uppercase text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 py-2 rounded-lg transition" title="Detalhes">
                        <i class="fas fa-info-circle mb-1 text-sm"></i> Info
                    </button>
                    <button onclick="baixarArquivo('${nome}')" class="flex flex-col items-center text-[11px] font-bold uppercase text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 py-2 rounded-lg transition" title="Baixar">
                        <i class="fas fa-cloud-download-alt mb-1 text-sm"></i> Baixar
                    </button>
                    <button onclick="excluirArquivo('${nome}')" class="flex flex-col items-center text-[11px] font-bold uppercase text-slate-500 hover:text-rose-600 hover:bg-rose-50 py-2 rounded-lg transition" title="Apagar">
                        <i class="fas fa-trash-alt mb-1 text-sm"></i> Excluir
                    </button>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        container.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-12 text-rose-500 text-center">
                <i class="fas fa-exclamation-triangle text-4xl mb-3"></i>
                <p class="font-bold">Erro de Conexão com API</p>
            </div>`;
    }
}

async function fazerUpload() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    const btnUpload = document.getElementById('btnUpload');
    
    if (!file) {
        Toast.fire({ icon: 'warning', title: 'Selecione um arquivo!' });
        return;
    }

    btnUpload.disabled = true;
    btnUpload.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Enviando...`;
    btnUpload.classList.add('opacity-75', 'cursor-not-allowed');
    
    try {
        const responseUrl = await fetch(`${API_BASE_URL}/arquivos/upload-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: file.name, tipo: file.type })
        });
        
        const data = await responseUrl.json();
        const uploadUrl = data.url_upload;

        if (!uploadUrl) {
            Swal.fire('Erro', 'A API não retornou a url de upload.', 'error');
            return;
        }

        const uploadS3 = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type }
        });

        if(uploadS3.ok) {
            Toast.fire({ icon: 'success', title: 'Arquivo salvo na AWS!' });
            fileInput.value = ''; 
            atualizarNomeArquivo();
            listarArquivos(); 
        } else {
            Toast.fire({ icon: 'error', title: 'Falha no S3.' });
        }
    } catch (error) {
        Toast.fire({ icon: 'error', title: 'Erro de conexão.' });
    } finally {
        btnUpload.disabled = false;
        btnUpload.innerHTML = `<i class="fas fa-paper-plane"></i> Salvar no Bucket S3`;
        btnUpload.classList.remove('opacity-75', 'cursor-not-allowed');
    }
}

async function baixarArquivo(nome) {
    Toast.fire({ icon: 'info', title: 'Gerando link seguro...' });
    try {
        const response = await fetch(`${API_BASE_URL}/arquivos/download-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: nome })
        });
        
        const data = await response.json();
        const downloadUrl = data.url_download;

        if (downloadUrl) {
            window.open(downloadUrl, '_blank');
        } else {
            Swal.fire('Erro', 'Não foi possível obter o link de download.', 'error');
        }
    } catch (error) {
        Swal.fire('Erro', 'Erro ao requisitar download.', 'error');
    }
}

async function excluirArquivo(nome) {
    Swal.fire({
        title: 'Excluir arquivo?',
        text: "Ele será apagado permanentemente do S3!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'Sim, apagar',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch(`${API_BASE_URL}/arquivos`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome: nome })
                });

                if (response.ok) {
                    Swal.fire('Excluído!', 'Removido da nuvem.', 'success');
                    listarArquivos(); 
                } else {
                    Swal.fire('Erro!', 'A API recusou a exclusão.', 'error');
                }
            } catch (error) {
                Swal.fire('Erro!', 'Ocorreu um erro de conexão.', 'error');
            }
        }
    });
}

async function detalhesArquivo(nome) {
    Swal.fire({ title: 'Buscando dados...', didOpen: () => Swal.showLoading() });
    try {
        const response = await fetch(`${API_BASE_URL}/arquivos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: nome })
        });
        const data = await response.json();
        
        Swal.fire({
            title: 'Metadados',
            html: `
                <div class="text-left bg-slate-50 p-5 rounded-xl border border-slate-200 mt-2 text-sm shadow-inner">
                    <p class="mb-3 border-b border-slate-200 pb-2"><i class="fas fa-file-signature text-indigo-400 mr-2"></i><strong>Nome:</strong> <br><span class="text-slate-600 break-all">${data.nome || nome}</span></p>
                    <p class="mb-3 border-b border-slate-200 pb-2"><i class="fas fa-weight-hanging text-indigo-400 mr-2"></i><strong>Tamanho:</strong> <br><span class="text-slate-600">${data.tamanho_bytes || 'N/A'} bytes</span></p>
                    <p><i class="fas fa-calendar-alt text-indigo-400 mr-2"></i><strong>Modificação:</strong> <br><span class="text-slate-600">${data.ultima_modificacao || 'N/A'}</span></p>
                </div>
            `,
            icon: 'info',
            confirmButtonColor: '#4f46e5'
        });
    } catch (error) {
        Swal.fire('Erro', 'Falha ao buscar detalhes.', 'error');
    }
}

window.onload = listarArquivos;
