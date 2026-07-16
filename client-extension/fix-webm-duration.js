/* ================================================================
   fix-webm-duration.js  –  WebM Duration Header Patcher

   MediaRecorder streams WebM without writing the Duration element
   into the Segment > Info header (players read it as Infinity).
   This utility parses the EBML structure of the recorded blob and
   injects the real duration (measured by the extension) so that
   video players and Cloudinary can read it instantly.

   Based on fix-webm-duration by Yury Sitnikov (MIT License)
   https://github.com/yusitnikov/fix-webm-duration
   ================================================================ */

(function (root) {
  /*
   * Only the EBML sections needed to reach Segment > Info > Duration
   * are typed here; everything else is copied through as raw bytes.
   * IDs are stored without their length-descriptor marker bits,
   * matching how readUint() below decodes them.
   */
  var sections = {
    0xa45dfa3: { name: 'EBML', type: 'Container' },
    0x8538067: { name: 'Segment', type: 'Container' },
    0x549a966: { name: 'Info', type: 'Container' },
    0xad7b1: { name: 'TimecodeScale', type: 'Uint' },
    0x489: { name: 'Duration', type: 'Float' }
  };

  function doInherit(newClass, baseClass) {
    newClass.prototype = Object.create(baseClass.prototype);
    newClass.prototype.constructor = newClass;
  }

  function WebmBase(name, type) {
    this.name = name || 'Unknown';
    this.type = type || 'Unknown';
  }
  WebmBase.prototype.updateBySource = function () {};
  WebmBase.prototype.setSource = function (source) {
    this.source = source;
    this.updateBySource();
  };
  WebmBase.prototype.updateByData = function () {};
  WebmBase.prototype.setData = function (data) {
    this.data = data;
    this.updateByData();
  };

  function WebmUint(name, type) {
    WebmBase.call(this, name, type || 'Uint');
  }
  doInherit(WebmUint, WebmBase);

  function padHex(hex) {
    return hex.length % 2 === 1 ? '0' + hex : hex;
  }

  // Unsigned integers are kept as hex strings to survive values > 32 bit
  WebmUint.prototype.updateBySource = function () {
    this.data = '';
    for (var i = 0; i < this.source.length; i++) {
      var hex = this.source[i].toString(16);
      this.data += padHex(hex);
    }
  };
  WebmUint.prototype.updateByData = function () {
    var length = this.data.length / 2;
    this.source = new Uint8Array(length);
    for (var i = 0; i < length; i++) {
      var hex = this.data.substr(i * 2, 2);
      this.source[i] = parseInt(hex, 16);
    }
  };
  WebmUint.prototype.getValue = function () {
    return parseInt(this.data, 16);
  };
  WebmUint.prototype.setValue = function (value) {
    this.setData(padHex(value.toString(16)));
  };

  function WebmFloat(name, type) {
    WebmBase.call(this, name, type || 'Float');
  }
  doInherit(WebmFloat, WebmBase);
  WebmFloat.prototype.getFloatArrayType = function () {
    return this.source && this.source.length === 4 ? Float32Array : Float64Array;
  };
  WebmFloat.prototype.updateBySource = function () {
    var byteArray = this.source.slice().reverse();
    var floatArrayType = this.getFloatArrayType();
    var floatArray = new floatArrayType(byteArray.buffer);
    this.data = floatArray[0];
  };
  WebmFloat.prototype.updateByData = function () {
    var floatArrayType = this.getFloatArrayType();
    var floatArray = new floatArrayType([this.data]);
    var byteArray = new Uint8Array(floatArray.buffer);
    this.source = byteArray.reverse();
  };
  WebmFloat.prototype.getValue = function () {
    return this.data;
  };
  WebmFloat.prototype.setValue = function (value) {
    this.setData(value);
  };

  function WebmContainer(name, type) {
    WebmBase.call(this, name, type || 'Container');
  }
  doInherit(WebmContainer, WebmBase);

  WebmContainer.prototype.readByte = function () {
    return this.source[this.offset++];
  };

  // Reads an EBML variable-length integer, stripping the length marker bit
  WebmContainer.prototype.readUint = function () {
    var firstByte = this.readByte();
    var bytes = 8 - firstByte.toString(2).length;
    var value = firstByte - (1 << (7 - bytes));
    for (var i = 0; i < bytes; i++) {
      value *= 256;
      value += this.readByte();
    }
    return value;
  };

  WebmContainer.prototype.updateBySource = function () {
    var end;
    this.data = [];
    for (this.offset = 0; this.offset < this.source.length; this.offset = end) {
      var id = this.readUint();
      var len = this.readUint();
      // MediaRecorder writes the Segment with "unknown size" (all 1 bits),
      // so clamp to the real end of the buffer.
      end = Math.min(this.offset + len, this.source.length);
      var data = this.source.slice(this.offset, end);

      var info = sections[id] || { name: 'Unknown', type: 'Unknown' };
      var ctr = WebmBase;
      switch (info.type) {
        case 'Container':
          ctr = WebmContainer;
          break;
        case 'Uint':
          ctr = WebmUint;
          break;
        case 'Float':
          ctr = WebmFloat;
          break;
      }
      var section = new ctr(info.name, info.type);
      section.setSource(data);
      this.data.push({ id: id, idHex: id.toString(16), data: section });
    }
  };

  // Writes an EBML variable-length integer, restoring the marker bit.
  // In draft mode only the offset is advanced (first pass measures length).
  WebmContainer.prototype.writeUint = function (x, draft) {
    for (var bytes = 1, flag = 0x80; x >= flag && bytes < 8; bytes++, flag *= 0x80) {}

    if (!draft) {
      var value = flag + x;
      for (var i = bytes - 1; i >= 0; i--) {
        var c = value % 256;
        this.source[this.offset + i] = c;
        value = (value - c) / 256;
      }
    }

    this.offset += bytes;
  };

  WebmContainer.prototype.writeSections = function (draft) {
    this.offset = 0;
    for (var i = 0; i < this.data.length; i++) {
      var section = this.data[i],
        content = section.data.source,
        contentLength = content.length;
      this.writeUint(section.id, draft);
      this.writeUint(contentLength, draft);
      if (!draft) {
        this.source.set(content, this.offset);
      }
      this.offset += contentLength;
    }
    return this.offset;
  };

  WebmContainer.prototype.updateByData = function () {
    // First pass (draft) computes the total size, second pass writes bytes
    var length = this.writeSections('draft');
    this.source = new Uint8Array(length);
    this.writeSections();
  };

  WebmContainer.prototype.getSectionById = function (id) {
    for (var i = 0; i < this.data.length; i++) {
      var section = this.data[i];
      if (section.id === id) {
        return section.data;
      }
    }
    return null;
  };

  function WebmFile(source) {
    WebmContainer.call(this, 'File', 'File');
    this.setSource(source);
  }
  doInherit(WebmFile, WebmContainer);

  WebmFile.prototype.fixDuration = function (duration) {
    var segmentSection = this.getSectionById(0x8538067);
    if (!segmentSection) {
      return false; // Segment section is missing
    }

    var infoSection = segmentSection.getSectionById(0x549a966);
    if (!infoSection) {
      return false; // Info section is missing
    }

    var timeScaleSection = infoSection.getSectionById(0xad7b1);
    if (!timeScaleSection) {
      return false; // TimecodeScale section is missing
    }

    var durationSection = infoSection.getSectionById(0x489);
    if (durationSection) {
      if (durationSection.getValue() <= 0) {
        durationSection.setValue(duration);
      } else {
        return false; // Duration is already written and valid
      }
    } else {
      // Append the missing Duration element to the Info section
      durationSection = new WebmFloat('Duration', 'Float');
      durationSection.setValue(duration);
      infoSection.data.push({ id: 0x489, data: durationSection });
    }

    // Set the timecode scale to 1 millisecond so the duration value
    // (which the extension measures in ms) matches the scale
    timeScaleSection.setValue(1000000);
    infoSection.updateByData();
    segmentSection.updateByData();
    this.updateByData();

    return true;
  };

  WebmFile.prototype.toBlob = function (mimeType) {
    return new Blob([this.source.buffer], { type: mimeType || 'video/webm' });
  };

  /**
   * Injects `durationMs` into a MediaRecorder-produced WebM blob.
   * Resolves with the patched blob, or the original blob unchanged
   * if the file cannot be parsed or already has a valid duration.
   *
   * @param {Blob} blob - recorded WebM blob
   * @param {number} durationMs - real recording duration in milliseconds
   * @returns {Promise<Blob>}
   */
  function fixWebmDuration(blob, durationMs) {
    return new Promise(function (resolve) {
      try {
        var reader = new FileReader();
        reader.onloadend = function () {
          try {
            var file = new WebmFile(new Uint8Array(reader.result));
            if (file.fixDuration(durationMs)) {
              resolve(file.toBlob(blob.type));
              return;
            }
          } catch (ex) {
            // Fall through to resolving with the original blob
          }
          resolve(blob);
        };
        reader.onerror = function () {
          resolve(blob);
        };
        reader.readAsArrayBuffer(blob);
      } catch (ex) {
        resolve(blob);
      }
    });
  }

  root.fixWebmDuration = fixWebmDuration;
})(typeof self !== 'undefined' ? self : this);
