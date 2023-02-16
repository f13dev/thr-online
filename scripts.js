jQuery(document).ready(function( $) {
    var slider;
    var pageY;
    var linenum = 0;
    var manufacturer_bytes,
        manufacturer,
        family_bytes,
        family,
        model_bytes,
        model,
        version_bytes,
        version,
        version_string,
        thr_out,
        thr_in;

    /**
     * This will be replaced with a read value from the THR unit to set values relative to the actual values
     */
    $('#model_knob').css('transform', 'rotate(-140deg)');

    /**
     * Get model name
     */
    function get_model_name() {
        switch (model) {
            case '0000': return 'THR10II'; break;
            case '0001': return 'THR10IIWireless'; break;
            case '0002': return 'THR30IIWireless'; break;
            case '0003': return 'THR30IIAcousticWireless'; break;
        }
    }

    /**
     * Work out the magic key from the firmware
     * 
     * @returns Array magic key
     */
    function get_magic_key() {
        switch (version_string) {
            case '1.30.0.c': return [0x60, 0x6b, 0x3e, 0x6f, 0x68]; break; 
            case '1.31.0.k': return [0x28, 0x24, 0x6b, 0x09, 0x18]; break;
            case '1.40.0.a': return [0x10, 0x5c, 0x61, 0x06, 0x79]; break;
        } 
        return [0x28, 0x72, 0x4d, 0x54, 0x5d];
    }

    /**
     * Format message data
     */
    function format_message_data(data)
    {
        var resp = [];
        resp.push(0xf0);
        resp = resp.concat(manufacturer_bytes);
        resp = resp.concat(family_bytes);
        resp = resp.concat(model_bytes);
        resp = resp.concat(data);
        resp.push(0xf7);

        console.log('Created message', resp);

        return resp;
    }

    /**
     * THR Console
     */
    function thr_console(line) {
        console.log(line);
        var thr_console = $('#console');
        thr_console.html(thr_console.html() + linenum.toString().padStart(4, '0')+") "+line+"<br>");
        thr_console.animate({ scrollTop: thr_console.prop('scrollHeight')}, 0);
        linenum++;
    }

    /**
     * Convert an array of 8 x 7 bit bytes into an array of 7 x 8 bit bytes
     * 
     * @param Array data 7 bit bytes, first being bit bucket
     * @return Array of 7 x 8 bit bytes
     */
    function undo_bitbucket(data) {
        if (data.length != 8) {
            console.log('Invalid data length '+data.length+', should be 8');
            return;
        }
        
        var bb = data[0];
        data.shift();
        // Convert bb to binary
        bb = parseInt(bb, 16).toString(2).padStart(data.length, '0');
        // Array to store binary data 
        var bin = [];
        data.forEach(function(d) {
            bin.push(parseInt(d, 16).toString(2).padStart(7, '0'));
        });
        // Create output array 
        var hex = [];
        bin.forEach(function(d, i) {
            hex.push(parseInt(bb[i]+d, 2).toString(16).padStart(2, '0'));
        });

        return hex;
    }

    /**
     * Convert an array of 7 x 8 bit bytes to a bit bucketed array of 8 x 7 bit bytes
     * 
     * @param Array data 7 x 8 bit bytes
     * @return Array of 8 x 7 bit bytes, first being bit bucket
     */
    function create_bitbucket(data)
    {
        if (data.length != 7) {
            console.log('Invalid data length '+data.length+', should be 7');
        }
        // Store the binary values 
        var bin = [];
        data.forEach(function(d) {
            bin.push(parseInt(d, 16).toString(2).padStart(8, '0'));
        });
        // create binary bit bucket string
        var bin_bb = '';
        bin.forEach(function(d) {
            bin_bb = bin_bb + d[0];
        });
        // Build response
        var res = [];
        res.push(parseInt(bin_bb, 2).toString(16).padStart(2, '0'));
        bin.forEach(function(d) {
            res.push(parseInt(d.substring(1), 2).toString(16).padStart(2, '0'));
        });

        return res;
    }

    function set_hardware(data) {
        manufacturer_bytes = [parseInt(data[5], 16),parseInt(data[6], 16),parseInt(data[7], 16)];
        manufacturer = data[5]+data[6]+data[7];

        family_bytes = [parseInt(data[8], 16)];
        family = data[8];

        model_bytes = [parseInt(data[10], 16),0x4d];
        model = data[10]+data[11];

        version_bytes = [data[12],data[13],data[14],data[15]];
        version = data[12]+data[13]+data[14]+data[15];
        version_string = parseInt(data[15], 16).toString(10)+'.'+parseInt(data[14], 16).toString(10)+'.'+parseInt(data[13], 16).toString(10)+'.'+String.fromCharCode(parseInt(data[12], 16));

        thr_console('Found device: '+get_model_name()+' Version: '+version_string);
        thr_console("Request firmware version");
        thr_out.send(format_message_data([0x00, 0x00, 0x00, 0x00, 0x07, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));

        thr_console("Sending header");
        thr_out.send(format_message_data([0x00, 0x01, 0x00, 0x00, 0x07, 0x00, 0x04, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));

        thr_console("Sending payload");
        var payload = [0x00, 0x02, 0x00, 0x00, 0x03];
        payload = payload.concat(get_magic_key());
        payload = payload.concat([0x00, 0x00, 0x00]);
        console.log('payload', payload);
        thr_out.send(format_message_data(payload));

        thr_console("Retrieving settings");
        thr_out.send(format_message_data([0x01, 0x02, 0x00, 0x00, 0x0b, 0x00, 0x0c, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x3c, 0x00, 0x7f, 0x7f, 0x7f, 0x7f, 0x00, 0x00]));

        return;
    }

    function decode_input(data) {
        var a = [];
        data.forEach(function(d) {
            a.push(d.toString(16).padStart(2, '0').toUpperCase());
        });

        if (a[1]+a[2]+a[3]+a[4] == "7E7F0602") {
            // This is a response to the initial setup
            set_hardware(a);
        }

        var str = '';

        if (a[1]+a[2]+a[3] == '00010C') {
            str += 'Line6 ';
        }
        if (a[4] == '24') {
            str += 'THRII ';
        }
        if (a[5]+a[6] == '004D') {
            str += 'THR10II ';
        } else 
        if (a[5]+a[6] == '014D') {
            str += 'THR10IIWireless ';
        } else 
        if (a[5]+a[6] == '024D') {
            str += 'THR30IIWireless ';
        } else 
        if (a[5]+a[6] == '034D') {
            str += 'THR30IIAcousticWireless ';
        }
        if (a[7] == '00') {
            str += 'A ';
        } else 
        if (a[7] == '01') {
            str += 'B ';
        }
        str += 'Msg '+a[8]+' ';

        // This bit needs some work
        str += 'Last valid byte '+parseInt(a[9]+a[10]+a[11], 16).toString(10);

        input_data = [];

        var arr = [];
        // Read each remaining bit
        for (var i = 12; i <= a.length; i++) {
            if (a[i] == 'F7') {
                break; // End of data
            } else { 
                arr.push(a[i]);

                if (arr.length == 8) {
                    //console.log(arr);
                    var decoded = undo_bitbucket(arr);
                    decoded.forEach(function(d) {
                        input_data.push(d);
                    })
                    console.log(decoded);
                    //str += "("+decoded+") ";
                    arr = [];
                }
            }

        }

        console.log('decoded message', str, input_data);

    }


    /**
     * Initalise WebMidi
     */
    WebMidi
    .enable(function(err) {
        if (err) {
            thr_console("WebMidi could not be enabled");
        } else {
            if (WebMidi.inputs.length == 0) {
                thr_console("Not connected");
                return;
            }

            // Replace this with a device selector
            thr_in = WebMidi.inputs[0];
            thr_out = WebMidi.outputs[0];

            thr_console("Connected to "+thr_in.name);

            thr_in.addListener("sysex", "all", function(e) {
                if (e.data) {

                    /* Start of section that just logs, it should be refactored */
                    var data = '';
                    e.data.forEach(function(d) {
                        data += d.toString(16).padStart(2, '0').toUpperCase()+" ";
                    });
                    thr_console(data);
                    /* End of section that just logs */

                    decode_input(e.data);
                }
            });

            /**
             * Handshake, needs some work to handle different models
             */
            thr_console('Attempting init');
            thr_out.send([0xf0, 0x7e, 0x7f, 0x06, 0x01, 0xf7]);

            /*
            setTimeout(() => {
                thr_console("Init message");
                thr_out.send([0xf0, 0x7E, 0x7F, 0x06, 0x01, 0xf7]);
                setTimeout(() => {
                    thr_console("Request firmware version");
                    thr_out.send([0xf0, 0x00, 0x01, 0x0c, 0x24, 0x00, 0x4d, 0x00, 0x00, 0x00, 0x00, 0x07, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf7])
                    setTimeout(() => {
                        thr_console("Sending header");
                        thr_out.send([0xf0, 0x00, 0x01, 0x0c, 0x24, 0x00, 0x4d, 0x00, 0x01, 0x00, 0x00, 0x07, 0x00, 0x04, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf7])
                        setTimeout(() => {
                            thr_console("Sending payload");
                            thr_out.send([0xf0, 0x00, 0x01, 0x0c, 0x24, 0x00, 0x4d, 0x00, 0x02, 0x00, 0x00, 0x03, 0x28, 0x72, 0x4d, 0x54, 0x5d, 0x00, 0x00, 0x00, 0xf7]);
                            setTimeout(() => {
                                thr_console("Retrieving settings");
                                thr_out.send([0xf0, 0x00, 0x01, 0x0c, 0x24, 0x00, 0x4d, 0x01, 0x02, 0x00, 0x00, 0x0b, 0x00, 0x0c, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x3c, 0x00, 0x7f, 0x7f, 0x7f, 0x7f, 0x00, 0x00, 0xf7]);
                            }, 500);
                        }, 500);
                    }, 500);
                }, 500);
            }, 500);
            */

            /**
             * Controls event listener
             */
            $(document).on('click', function(e) {
                if (!e.target.id || e.target.id == '') {
                    return;
                }

                switch (e.target.id) {
                    case 'get_dump':
                        thr_console('Getting dump of symbol table');
                        thr_out.send(format_message_data([0x00, 0x03, 0x00, 0x00, 0x07, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
                    case 'classic_lead':
                        thr_console("Classic Lead");
                        thr_out.send([0xf0, 0x00, 0x01, 0x0c, 0x24, 0x00, 0x4d, 0x00, 0x03, 0x00, 0x00, 0x07, 0x00, 0x08, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf7]);
                        thr_out.send([0xf0, 0x00, 0x01, 0x0c, 0x24, 0x00, 0x4d, 0x00, 0x04, 0x00, 0x00, 0x07, 0x04, 0x0c, 0x01, 0x00, 0x00, 0x19, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf7]);
                    break;
                    case 'classic_special':
                        thr_console("Classic Special");
                        thr_out.send([0xf0, 0x00, 0x01, 0x0c, 0x24, 0x00, 0x4d, 0x00, 0x03, 0x00, 0x00, 0x07, 0x00, 0x08, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf7]);
                        thr_out.send([0xf0, 0x00, 0x01, 0x0c, 0x24, 0x00, 0x4d, 0x00, 0x04, 0x00, 0x00, 0x07, 0x00, 0x0c, 0x01, 0x00, 0x00, 0x78, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf7]);
                    break;
                    case 'classic_high_gain':
                        thr_console("Classic High Gain");
                        thr_out.send([0xf0, 0x00, 0x01, 0x0c, 0x24, 0x00, 0x4d, 0x00, 0x03, 0x00, 0x00, 0x07, 0x00, 0x08, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf7]);
                        thr_out.send([0xf0, 0x00, 0x01, 0x0c, 0x24, 0x00, 0x4d, 0x00, 0x04, 0x00, 0x00, 0x07, 0x00, 0x0c, 0x01, 0x00, 0x00, 0x7f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf7]);
                    break;
                    case 'classic_crunch':
                        thr_console("Classic Crunch");
                        thr_out.send([0xf0, 0x00, 0x01, 0x0c, 0x24, 0x00, 0x4d, 0x00, 0x03, 0x00, 0x00, 0x07, 0x00, 0x08, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf7]);
                        thr_out.send([0xf0, 0x00, 0x01, 0x0c, 0x24, 0x00, 0x4d, 0x00, 0x04, 0x00, 0x00, 0x07, 0x04, 0x0c, 0x01, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf7]);
                    break;
                    case 'classic_clean':
                        thr_console("Classic Clean");
                        thr_out.send([0xf0, 0x00, 0x01, 0x0c, 0x24, 0x00, 0x4d, 0x00, 0x03, 0x00, 0x00, 0x07, 0x00, 0x08, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf7]);
                        thr_out.send([0xf0, 0x00, 0x01, 0x0c, 0x24, 0x00, 0x4d, 0x00, 0x04, 0x00, 0x00, 0x07, 0x00, 0x0c, 0x01, 0x00, 0x00, 0x4a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf7]);
                    break;
                    case 'classic_bass':
                        thr_console("Classic Bass");
                        thr_out.send([0xf0, 0x00, 0x01, 0x0c, 0x24, 0x00, 0x4d, 0x00, 0x03, 0x00, 0x00, 0x07, 0x00, 0x08, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf7]);
                        thr_out.send([0xf0, 0x00, 0x01, 0x0c, 0x24, 0x00, 0x4d, 0x00, 0x04, 0x00, 0x00, 0x07, 0x04, 0x0c, 0x01, 0x00, 0x00, 0x37, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf7]);
                    break;
                    case 'classic_aco':
                        thr_console("Classic Acoustic");
                        thr_out.send([0xf0, 0x00, 0x01, 0x0c, 0x24, 0x00, 0x4d, 0x00, 0x03, 0x00, 0x00, 0x07, 0x00, 0x08, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf7]);
                        thr_out.send([0xf0, 0x00, 0x01, 0x0c, 0x24, 0x00, 0x4d, 0x00, 0x04, 0x00, 0x00, 0x07, 0x04, 0x0c, 0x01, 0x00, 0x00, 0x13, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf7]);
                    break;
                    case 'flat':
                        thr_console("Flat");
                        thr_out.send([0xf0, 0x00, 0x01, 0x0c, 0x24, 0x00, 0x4d, 0x00, 0x03, 0x00, 0x00, 0x07, 0x00, 0x08, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf7]);
                        thr_out.send([0xf0, 0x00, 0x01, 0x0c, 0x24, 0x00, 0x4d, 0x00, 0x04, 0x00, 0x00, 0x07, 0x04, 0x0c, 0x01, 0x00, 0x00, 0x0f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf7]);
                    break;
                }


                //if (e.srcElement.attributes.id.textContent == 'preset') {
                //    thr_console("Preset");
                //    thr_out.send([0xf0, 0x00, 0x01, 0x0c, 0x24, 0x00, 0x4d, 0x00, 0x03, 0x00, 0x00, 0x07, 0x00, 0x08, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf7]);
                //    thr_out.send([0xF0, 0x00, 0x01, 0x0C, 0x24, 0x00, 0x4D, 0x00, 0x0C, 0x00, 0x01, 0x07, 0x00, 0x02, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF7]);
                //}
            });
        }
    }, true);

    $(document).on('change', '#console', function() {
        console.log('changed');
    });

    $(document).on('mousedown', '.knob', function(e) {
        slider = $(this).data('slider');
        if (slider == '') {
            return;
        }
        pageX = e.pageX;
        pageY = e.pageY;
    }).on('mousemove mouseup', function(e) {
        if (!slider) {
            return;
        }
        var new_val = parseInt($('#'+slider).val()) + ((pageY - e.pageY) / 20);
        if (new_val > parseInt($('#'+slider).attr('max'))) {
            new_val = parseInt($('#'+slider).attr('max'));
        } else 
        if (new_val < parseInt($('#'+slider).attr('min'))) {
            new_val = parseInt($('#'+slider).attr('min'));
        }
        $('#'+slider).val(new_val).trigger('input');
        if (e.type == 'mouseup') {
            slider = false;
            return(2);
        }
    });

    $(document).on('input', '.slider', function() {
        var knob = $(this).data('knob');
        if (knob == '') {
            return; // No associated knob
        }
        var val = $(this).val();
        var deg = val * 3;
        deg = deg - 150;
        $('#'+knob).css('transform', 'rotate('+deg+'deg)');
        var value = $(this).data('value');
        if (value) {
            $('#'+value).html($(this).val());
        }
        return;

        if (val == 50) {
            $('#'+knob).css('transform', 'rotate(0deg)');
        } else 
        if (val < 50) {
            $('#'+knob).css('transform', 'rotate(-'+(val * 2)+'deg)');
        } else {
            $('#'+knob).css('transform', 'rotate('+(val * 2)+'deg)');
        }
    });

    $(document).on('click', '.led', function() {
        console.log('clicked on led');
        $(this).parent().trigger('click');
    });

    $(document).on('click', '.model_control button', function() {
        console.log($(this).attr('id'));
        $('.model_control button .led').each(function() {
            $(this).removeClass('active');
        });
        switch ($(this).attr('id')) {
            case 'classic_clean':
                $('.model_control #classic_clean .led').addClass('active');
                $('#model_knob').css('transform', 'rotate(-140deg)');
                $('#model_select').val(1);
                break;
            case 'classic_special':
                $('.model_control #classic_special .led').addClass('active');
                $('#model_knob').css('transform', 'rotate(-40deg)');
                $('#model_select').val(5);
                break;
            case 'classic_crunch':
                $('.model_control #classic_crunch .led').addClass('active');
                $('#model_knob').css('transform', 'rotate(-115deg)');
                $('#model_select').val(2);
                break;
            case 'classic_high_gain':
                $('.model_control #classic_high_gain .led').addClass('active');
                $('#model_knob').css('transform', 'rotate(-65deg)');
                $('#model_select').val(4);
                break;
            case 'classic_lead':
                $('.model_control #classic_lead .led').addClass('active');
                $('#model_knob').css('transform', 'rotate(-90deg)');
                $('#model_select').val(3);
                break;
            case 'classic_aco':
                $('.model_control #classic_aco .led').addClass('active');
                $('#model_knob').css('transform', 'rotate(90deg)');
                $('#model_select').val(7);
                break;
            case 'classic_bass':
                $('.model_control #classic_bass .led').addClass('active');
                $('#model_knob').css('transform', 'rotate(65deg)');
                $('#model_select').val(6);
                break;
            case 'flat':
                $('.model_control #flat .led').addClass('active');
                $('#model_knob').css('transform', 'rotate(115deg)');
                $('#model_select').val(8);
                break;
        }
    });

    $(document).on('input', '#model_select', function() {
        switch ($(this).val()) {
            case '1':
                $('#classic_clean').trigger('click');
                break;
            case '2': 
                $('#classic_crunch').trigger('click');
                break;
            case '3':
                $('#classic_lead').trigger('click');
                break;
            case '4':
                $('#classic_high_gain').trigger('click');
                break;
            case '5':
                $('#classic_special').trigger('click');
                break;
            case '6':
                 $('#classic_bass').trigger('click');
                break;
            case '7':
                $('#classic_aco').trigger('click');
                break;
            case '8':
                $('#flat').trigger('click');
                break;
        }
    });





    var data = ["00", "04", "00", "00", "00", "96", "FF"];
    console.log('input data', data);
    var bb_data = create_bitbucket(data);
    console.log('bit bucketed data', bb_data);
    var raw_data = undo_bitbucket(bb_data);
    console.log('raw data', raw_data);

    var data = ["ff", "ff", "ff", "ff", "55", "01", "00"];
    console.log('input data', data);
    var bb_data = create_bitbucket(data);
    console.log('bit bucketed data', bb_data);
    var raw_data = undo_bitbucket(bb_data);
    console.log('raw data', raw_data);

});


// Basic JS functions
