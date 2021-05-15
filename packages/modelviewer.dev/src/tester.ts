/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {ModelViewerElement} from '@google/model-viewer/lib/model-viewer';
import {SimpleDropzone} from 'simple-dropzone';

const viewer = document.getElementById('loading-demo') as ModelViewerElement;
const inputElement = document.querySelector('#input');
const annotationView = document.getElementById('annotation-view') as HTMLElement;
const annotationText = document.getElementById('annotation') as HTMLInputElement;
const dropControl = new SimpleDropzone(viewer, inputElement);
dropControl.on('drop', ({files}: any) => load(files));

function resetModel() {
  viewer.reveal = 'auto';
  viewer.dismissPoster();
  // remove hotspots
  while (viewer.firstChild) {
    viewer.removeChild(viewer.firstChild);
  }
}

let hotspotCounter = 0;
let selectedHotspot: HTMLElement|undefined = undefined;

export function removeHotspot() {
  if (selectedHotspot != null) {
    viewer.removeChild(selectedHotspot);
  }
  annotationView.classList.remove('active');
}

function select(hotspot: HTMLElement) {
  for (let i = 0; i < viewer.children.length; i++) {
    viewer.children[i].classList.remove('selected');
  }
  hotspot.classList.add('selected');
  selectedHotspot = hotspot;

  annotationText.value = hotspot.children[0].textContent!;
  annotationView.classList.add('active');
}

viewer.addEventListener('dblclick', onDoubleClick);
function onDoubleClick(event: MouseEvent) {
  const rect = viewer.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const positionAndNormal = viewer.positionAndNormalFromPoint(x, y);

  if (positionAndNormal == null) {
    console.log('no hit result: mouse = ', x, ', ', y);
    return;
  }
  const {position, normal} = positionAndNormal;

  const hotspot = document.createElement('button');
  hotspot.slot = `hotspot-${hotspotCounter++}`;
  hotspot.classList.add('hotspot');
  hotspot.dataset.position = position.toString();
  if (normal != null) {
    hotspot.dataset.normal = normal.toString();
  }

  const label = document.createElement('div');
  label.classList.add("annotation");
  label.classList.add("unset");
  label.textContent = "";
  hotspot.appendChild(label);

  viewer.appendChild(hotspot);

  select(hotspot);
  hotspot.addEventListener('click', () => {select(hotspot)});

  annotationView.classList.add('active');
}

viewer.addEventListener('click', onClick);
function onClick(event: MouseEvent) {
  if (event.target != viewer) {
    return;
  }
  for (let i = 0; i < viewer.children.length; i++) {
    viewer.children[i].classList.remove('selected');
  }
  annotationView.classList.remove('active');
}


function submitAnnotation() {
  if (selectedHotspot != null) {
    selectedHotspot.children[0].textContent = annotationText.value;
    selectedHotspot.children[0].classList.remove("unset");
  }
  annotationView.classList.remove('active');
}

(self as any).removeHotspot = removeHotspot;
(self as any).submitAnnotation = submitAnnotation;


function load(fileMap: Map<string, File>) {
  let rootPath: string;
  Array.from(fileMap).forEach(([path, file]) => {
    const filename = file.name.toLowerCase();
    if (filename.match(/\.(gltf|glb)$/)) {
      const blobURLs: Array<string> = [];
      rootPath = path.replace(file.name, '');

      ModelViewerElement.mapURLs((url: string) => {
        const index = url.lastIndexOf('/');

        const normalizedURL =
            rootPath + url.substr(index + 1).replace(/^(\.?\/)/, '');

        if (fileMap.has(normalizedURL)) {
          const blob = fileMap.get(normalizedURL);
          const blobURL = URL.createObjectURL(blob);
          blobURLs.push(blobURL);
          return blobURL;
        }

        return url;
      });

      viewer.addEventListener('load', () => {
        blobURLs.forEach(URL.revokeObjectURL);
      });

      const fileURL =
          typeof file === 'string' ? file : URL.createObjectURL(file);
      viewer.src = fileURL;
      resetModel();
    }
  });

  if (fileMap.size === 1) {
    const file = fileMap.values().next().value;
    const filename = file.name.toLowerCase();
    if (filename.match(/\.(hdr)$/)) {
      viewer.environmentImage = URL.createObjectURL(file) + '#.hdr';
    } else if (filename.match(/\.(png|jpg)$/)) {
      viewer.environmentImage = URL.createObjectURL(file);
    }
  }
}
